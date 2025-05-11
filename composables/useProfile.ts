import { computed, watch, onMounted } from 'vue'
import { updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword as firebaseUpdatePassword, sendEmailVerification } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { showToast } from '~/utils/toast'
import { handleAuthError } from '~/utils/errorHandler'
import { validatePassword, validatePasswordsMatch } from '~/utils/passwordUtils'
import { useImageUpload } from '~/utils/imageUtils/imageUploadUtils'
import { getUserImages } from '~/utils/imageUtils/imageLimitUtil'
import { getDownloadURL } from 'firebase/storage'
import { formatDate } from '~/utils/dateUtil'
import { profileCache } from '~/utils/storageUtils/cacheUtil'
import { getCachedImageUrls, profileImageCache } from '~/utils/storageUtils/imageCacheUtil'

// Define type for user document
interface UserDocument {
  username?: string;
  bio?: string;
  profile_image_url?: string;
  updatedAt?: Date;
  [key: string]: any;
}

export const useProfile = () => {
  const { user } = useAuth()
  const { firestore, auth, storage } = useFirebase()
  const { uploadImage, uploadError } = useImageUpload()

  // shared UI state
  const isEditing = useState('profile-isEditing', () => false)
  const isSaving = useState('profile-isSaving', () => false)
  const isImageUploading = useState('profile-isImageUploading', () => false)
  const isLoadingUserImages = useState('profile-isLoadingUserImages', () => false)

  // shared data state
  const userName = useState('profile-userName', () => '')
  const userPhotoUrl = useState('profile-userPhotoUrl', () => '/images/Profile_Pictures/default_profile.jpg')
  const profileData = useState('profile-data', () => ({
    username: '',
    bio: '',
    profileImage: ''
  }))
  const tempProfileImage = useState('profile-tempImage', () => '')
  
  // local states
  const userDoc = ref<UserDocument | null>(null)
  const showPasswordReset = ref(false)
  const isPasswordUpdating = ref(false)
  const passwordError = ref('')
  const isResendingEmail = ref(false)
  const passwordData = ref({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Available profile images (default + user saved images)
  const defaultProfileImages = [
    '/images/Profile_Pictures/fox_profile.webp',
    '/images/Profile_Pictures/coldfox_profile.webp',
    '/images/Profile_Pictures/eagle_profile.webp',
    '/images/Profile_Pictures/bear_profile.webp',
    '/images/Profile_Pictures/hare_profile.webp',
    '/images/Profile_Pictures/deer_profile.webp',
    '/images/Profile_Pictures/owl_profile.webp',
    '/images/Profile_Pictures/hippo_profile.webp',
    '/images/Profile_Pictures/bluebird_profile.webp',
    '/images/Profile_Pictures/orangebird_profile.webp',
    '/images/Profile_Pictures/parrot_profile.webp'
  ]
  
  // User's custom uploaded profile images from Firebase Storage
  const userCustomImages = useState('profile-userCustomImages', () => [] as string[])
  
  // Combined profile images (default + user custom)
  const profileImages = computed(() => {
    return [...userCustomImages.value, ...defaultProfileImages]
  })
  
  // Fetch user's custom images from Firebase Storage
  async function fetchUserCustomImages() {
    if (!user.value || !storage) return
    
    isLoadingUserImages.value = true
    
    try {
      // Get the path for this user's profile images
      const userImagesPath = `profile_pictures/${user.value.uid}`
      
      // Get the list of image references
      const userImagesData = await getUserImages(storage, userImagesPath)
      
      // Get download URLs for all images
      const imageUrls = await Promise.all(
        userImagesData.map(async (imageData) => {
          try {
            // Get download URL directly from StorageReference
            const url = await getDownloadURL(imageData.ref)
            return url
          } catch (error) {
            console.error(`Error getting download URL for ${imageData.ref.fullPath}:`, error)
            return null
          }
        })
      )
      
      // Filter out any nulls, apply caching using the new utility, and update the state
      userCustomImages.value = getCachedImageUrls(
        imageUrls.filter((url): url is string => url !== null)
      )
    } catch (error) {
      console.error('Error fetching user images:', error)
    } finally {
      isLoadingUserImages.value = false
    }
  }

  // Calculate profile completion percentage - recalculates when relevant data changes
  const profileCompletionPercentage = computed(() => {
    // Only these specific properties affect the completion percentage
    const { username, bio, profileImage } = profileData.value
    
    let completed = 0
    let total = 3 // Total number of profile fields
    
    if (username) completed++
    if (bio) completed++
    if (profileImage) completed++
    
    return Math.round((completed / total) * 100)
  })

  // Last password reset date (placeholder for now)
  const lastPasswordReset = computed(() => {
    // Needs firestore data to be implemented
    return formatDate(user.value?.metadata?.creationTime)
  })

  // Load user data from Firestore
  async function loadUserData(forceRefresh: boolean = false) {
    if (!user.value) return
    
    try {
      // Try to get from cache first, unless forceRefresh is true
      if (!forceRefresh) {
        const cachedData = profileCache.getProfileData(user.value.uid);
        
        if (cachedData) {
          userDoc.value = cachedData;
          
          // Set local data from cache
          userName.value = user.value.displayName || cachedData.username || user.value.email?.split('@')[0] || 'User';
          userPhotoUrl.value = cachedData.profile_image_url || '/images/Profile_Pictures/default_profile.jpg';
          
          // Update form data
          profileData.value = {
            username: user.value.displayName || cachedData.username || '',
            bio: cachedData.bio || '',
            profileImage: cachedData.profile_image_url || ''
          }
          
          // Load user's custom images
          await fetchUserCustomImages();
          return;
        }
      }
      
      // If not in cache or forceRefresh is true, fetch from Firestore
      const docRef = doc(firestore, 'users', user.value.uid)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data() as UserDocument;
        userDoc.value = data;
        
        // Cache the user data with profileCache utility
        profileCache.saveProfileData(user.value.uid, data);
        
        // Set local data - prioritize displayName from auth, then username from Firestore
        userName.value = user.value.displayName || data.username || user.value.email?.split('@')[0] || 'User';
        userPhotoUrl.value = data.profile_image_url || '/images/Profile_Pictures/default_profile.jpg';
        
        // Update form data
        profileData.value = {
          username: user.value.displayName || data.username || '',
          bio: data.bio || '',
          profileImage: data.profile_image_url || ''
        }
        
        // Load user's custom images
        await fetchUserCustomImages();
      }
    } catch (error) {
      showToast('Failed to load user data', 'error')
    }
  }

  // Save profile changes
  async function saveProfile() {
    if (!user.value) return
    
    isSaving.value = true
    
    try {
      const userDocRef = doc(firestore, 'users', user.value.uid)
      
      // Update Firestore document
      await updateDoc(userDocRef, {
        username: profileData.value.username,
        bio: profileData.value.bio,
        profile_image_url: profileData.value.profileImage,
        updatedAt: new Date()
      })
      
      // Update displayName in Firebase Auth with the same value
      await updateProfile(user.value, {
        displayName: profileData.value.username
      })
      
      showToast('Profile updated successfully', 'success')
      isEditing.value = false
      
      // Update the local state
      userName.value = profileData.value.username
      userPhotoUrl.value = profileData.value.profileImage || userPhotoUrl.value
      
      // Update userDoc value to match
      if (userDoc.value) {
        userDoc.value = {
          ...userDoc.value,
          username: profileData.value.username,
          bio: profileData.value.bio,
          profile_image_url: profileData.value.profileImage,
          updatedAt: new Date()
        }
        
        // Update the cache with profileCache utility
        profileCache.saveProfileData(user.value.uid, userDoc.value);
      }
    } catch (error) {
      showToast('Failed to update profile', 'error')
    } finally {
      isSaving.value = false
    }
  }

  // Select a profile image
  function selectProfileImage(image: string) {
    // Only update profileData, but don't change the actual userPhotoUrl yet
    profileData.value = {
      ...profileData.value,
      profileImage: image
    }
    
    // Save the selected image in temporary state
    tempProfileImage.value = image
  }

  // Upload custom profile image
  async function uploadCustomImage(file: File) {
    if (!user.value) return null;
    
    try {
      // Validate file size before upload
      const maxSizeInMB = 5; // 5MB max
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
      
      if (file.size > maxSizeInBytes) {
        throw new Error(`File size exceeds maximum allowed size of ${maxSizeInMB}MB`);
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Allowed types: JPEG, PNG, WebP');
      }
      
      isImageUploading.value = true;
      
      // Call the upload utility function
      const downloadURL = await uploadImage(
        file, 
        `profile_pictures/${user.value.uid}`,
        maxSizeInMB, // Pass the size limit to the upload function
        allowedTypes
      );
      
      if (downloadURL) {
        // Update profile data with new image URL
        profileData.value = {
          ...profileData.value,
          profileImage: downloadURL
        };
        
        tempProfileImage.value = downloadURL;
        
        // Cache the image URL using the new utility
        profileImageCache.cacheProfileImage(user.value.uid, downloadURL);
        
        // Directly update the userCustomImages array instead of fetching from server
        userCustomImages.value = [downloadURL, ...userCustomImages.value];
        
        // If there are more than MAX_USER_IMAGES (5), remove the oldest one from local state
        // This mirrors the server-side behavior in enforceImageLimit
        if (userCustomImages.value.length > 5) {
          userCustomImages.value = userCustomImages.value.slice(0, 5);
        }
        
        // If this is being set as the profile image, update the cache
        if (userDoc.value) {
          userDoc.value = {
            ...userDoc.value,
            profile_image_url: downloadURL
          };
          
          // Update the cache with profileCache utility
          profileCache.saveProfileData(user.value.uid, userDoc.value);
        }
        
        showToast('Image uploaded successfully', 'success');
        return downloadURL;
      } else {
        showToast(uploadError.value || 'Failed to upload image', 'error');
        return null;
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to upload image', 'error');
      return null;
    } finally {
      isImageUploading.value = false;
    }
  }

  // Update password
  async function updatePassword(passwordFormData?: any) {
    if (!user.value || !auth.currentUser) return
    
    // Reset error message
    passwordError.value = ''
    
    // Use either passed form data or stored state data
    const currentPasswordData = passwordFormData || passwordData.value
    
    // Validate current password
    if (!currentPasswordData.currentPassword) {
      passwordError.value = 'Please enter your current password'
      return
    }
    
    // Validate new password using the validation function
    const passwordValidation = validatePassword(currentPasswordData.newPassword)
    if (!passwordValidation.valid) {
      passwordError.value = passwordValidation.message
      return
    }
    
    // Check passwords match using the function
    const matchValidation = validatePasswordsMatch(
      currentPasswordData.newPassword, 
      currentPasswordData.confirmPassword
    )
    if (!matchValidation.valid) {
      passwordError.value = matchValidation.message
      return
    }
    
    isPasswordUpdating.value = true
    
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email || '',
        currentPasswordData.currentPassword
      )
      
      await reauthenticateWithCredential(auth.currentUser, credential)
      
      // Update the password
      await firebaseUpdatePassword(auth.currentUser, currentPasswordData.newPassword)
      
      showToast('Password updated successfully', 'success')
      showPasswordReset.value = false
      
      // Clear password fields
      passwordData.value = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
    } catch (error) {
      console.error('Error updating password:', error)
      passwordError.value = handleAuthError(error)
    } finally {
      isPasswordUpdating.value = false
    }
  }

  // Check if email is verified
  const isEmailVerified = computed(() => {
    return Boolean(user.value?.emailVerified)
  })

  // Resend verification email
  async function resendVerificationEmail() {
    if (!user.value) return
    
    isResendingEmail.value = true
    
    try {
      await sendEmailVerification(user.value)
      showToast('Verification email sent', 'success')
    } catch (error) {
      console.error('Error sending verification email:', error)
      showToast('Failed to send verification email', 'error')
    } finally {
      isResendingEmail.value = false
    }
  }

  // Initialize user data - use onMounted instead of watch for initialization
  const initializeUserData = async () => {
    if (user.value) {
      await loadUserData();
    }
  };

  // Initialize the composable
  onMounted(initializeUserData);

  // Set up a watcher to initialize tempProfileImage when editing starts
  watch(isEditing, (newValue) => {
    if (newValue === true) {
      // When editing starts, initialize the temporary image with the current profile image
      tempProfileImage.value = profileData.value.profileImage || userPhotoUrl.value
    } else {
      // When editing is cancelled, reset the profileData image to the original one from userPhotoUrl
      if (!isSaving.value) {
        profileData.value = {
          ...profileData.value,
          profileImage: userPhotoUrl.value
        }
        // Clear temp image
        tempProfileImage.value = ''
      }
    }
  })

  return {
    // State
    isEditing,
    isSaving,
    showPasswordReset,
    isPasswordUpdating,
    passwordError,
    isResendingEmail,
    isImageUploading,
    isLoadingUserImages,
    userName,
    userPhotoUrl,
    profileData,
    passwordData,
    profileImages,
    userCustomImages,
    defaultProfileImages,
    tempProfileImage,
    
    // Computed
    profileCompletionPercentage,
    lastPasswordReset,
    isEmailVerified,
    
    // Methods
    loadUserData,
    saveProfile,
    selectProfileImage,
    uploadCustomImage,
    updatePassword,
    resendVerificationEmail,
    fetchUserCustomImages,
  }
}