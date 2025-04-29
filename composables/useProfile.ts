import { computed, watch, onMounted } from 'vue'
import { updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword as firebaseUpdatePassword, sendEmailVerification } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { showToast } from '~/utils/toast'
import { handleAuthError } from '~/utils/errorHandler'
import { validatePassword, validatePasswordsMatch } from '~/utils/passwordUtils'

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
  const { firestore, auth } = useFirebase()

  // shared UI state
  const isEditing = useState('profile-isEditing', () => false)
  const isSaving = useState('profile-isSaving', () => false)

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

  // Available profile images
  const profileImages = [
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
  async function loadUserData() {
    if (!user.value) return
    
    try {
      const docRef = doc(firestore, 'users', user.value.uid)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        userDoc.value = docSnap.data()
        
        // Set local data - prioritize displayName from auth, then username from Firestore
        userName.value = user.value.displayName || userDoc.value.username || user.value.email?.split('@')[0] || 'User'
        userPhotoUrl.value = userDoc.value.profile_image_url || '/images/Profile_Pictures/default_profile.jpg'
        
        // Update form data
        profileData.value = {
          username: user.value.displayName || userDoc.value.username || '',
          bio: userDoc.value.bio || '',
          profileImage: userDoc.value.profile_image_url || ''
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
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
      
      // Update the local userName ref
      userName.value = profileData.value.username
      
      // Reload user data
      await loadUserData()
    } catch (error) {
      console.error('Error updating profile:', error)
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
    userName,
    userPhotoUrl,
    profileData,
    passwordData,
    profileImages,
    tempProfileImage,
    
    // Computed
    profileCompletionPercentage,
    lastPasswordReset,
    isEmailVerified,
    
    // Methods
    loadUserData,
    saveProfile,
    selectProfileImage,
    updatePassword,
    resendVerificationEmail,
  }
}