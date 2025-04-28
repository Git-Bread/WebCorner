import { ref, reactive, computed, watch } from 'vue'
import { updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword as firebaseUpdatePassword, sendEmailVerification } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { showToast } from '~/utils/toast'
import { handleAuthError } from '~/utils/errorHandler'

export const useProfile = () => {
  const { user } = useAuth()
  const { firestore, auth } = useFirebase()

  // UI state
  const isEditing = ref(false)
  const isSaving = ref(false)
  const showPasswordReset = ref(false)
  const isPasswordUpdating = ref(false)
  const passwordError = ref('')
  const isResendingEmail = ref(false)

  // User document reference
  const userDoc = ref<any>(null)
  const userName = ref('')
  const userPhotoUrl = ref('/images/Profile_Pictures/default_profile.jpg')

  // Profile data for the form
  const profileData = reactive({
    username: '',
    bio: '',
    profileImage: ''
  })

  // Password change data
  const passwordData = reactive({
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

  // Calculate profile completion percentage
  const profileCompletionPercentage = computed(() => {
    let completed = 0
    let total = 3 // Total number of profile fields we're checking
    
    if (profileData.username) completed++
    if (profileData.bio) completed++
    if (profileData.profileImage) completed++
    
    return Math.round((completed / total) * 100)
  })

  // Last password reset date (placeholder for now)
  const lastPasswordReset = computed(() => {
    // This would ideally come from Firebase, but we'll use account creation date as fallback
    return formatDate(user.value?.metadata?.creationTime)
  })

  // Format dates helper
  function formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

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
        
        // Update form data - merged username and displayName
        profileData.username = user.value.displayName || userDoc.value.username || ''
        profileData.bio = userDoc.value.bio || ''
        profileData.profileImage = userDoc.value.profile_image_url || ''
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
        username: profileData.username, // Username in Firestore
        bio: profileData.bio,
        profile_image_url: profileData.profileImage,
        updatedAt: new Date()
      })
      
      // Update displayName in Firebase Auth with the same value
      await updateProfile(user.value, {
        displayName: profileData.username // Use the same value for displayName
      })
      
      showToast('Profile updated successfully', 'success')
      isEditing.value = false
      
      // Update the local userName ref
      userName.value = profileData.username
      
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
    profileData.profileImage = image
  }

  // Password validation
  function validatePassword(password: string): { valid: boolean, message: string } {
    if (!password) {
      return { valid: false, message: 'Please enter a new password' }
    }
    
    if (password.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters' }
    }
    
    return { valid: true, message: '' }
  }

  // Update password
  async function updatePassword() {
    if (!user.value || !auth.currentUser) return
    
    // Reset error message
    passwordError.value = ''
    
    // Validate current password
    if (!passwordData.currentPassword) {
      passwordError.value = 'Please enter your current password'
      return
    }
    
    // Validate new password using same rules as registration
    const passwordValidation = validatePassword(passwordData.newPassword)
    if (!passwordValidation.valid) {
      passwordError.value = passwordValidation.message
      return
    }
    
    // Check passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      passwordError.value = 'New passwords do not match'
      return
    }
    
    isPasswordUpdating.value = true
    
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email || '',
        passwordData.currentPassword
      )
      
      await reauthenticateWithCredential(auth.currentUser, credential)
      
      // Update the password
      await firebaseUpdatePassword(auth.currentUser, passwordData.newPassword)
      
      showToast('Password updated successfully', 'success')
      showPasswordReset.value = false
      
      // Clear password fields
      passwordData.currentPassword = ''
      passwordData.newPassword = ''
      passwordData.confirmPassword = ''
    } catch (error) {
      console.error('Error updating password:', error)
      passwordError.value = handleAuthError(error)
    } finally {
      isPasswordUpdating.value = false
    }
  }

  // Check if email is verified
  const isEmailVerified = computed(() => user.value?.emailVerified)

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

  // Initialize user data
  watch(() => user.value, async (newUser) => {
    if (newUser) {
      await loadUserData()
    }
  }, { immediate: true })

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
    
    // Computed
    profileCompletionPercentage,
    lastPasswordReset,
    isEmailVerified,
    
    // Methods
    formatDate,
    loadUserData,
    saveProfile,
    selectProfileImage,
    updatePassword,
    resendVerificationEmail
  }
}