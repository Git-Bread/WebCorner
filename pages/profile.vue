<template>
  <div class="min-h-[90vh] bg-gradient-page py-8 px-4">
    <div class="container mx-auto">
      <!-- Page header with user's name - moved to left alignment -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-heading">{{ user?.displayName || userName || 'My Profile' }}</h1>
        <p class="text-text-muted mt-2">Manage your account information and preferences</p>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <!-- Left sidebar with avatar and quick stats -->
        <div class="lg:col-span-1">
          <!-- Profile card -->
          <div class="bg-background shadow-lg rounded-lg p-6 mb-6 form-fade-in">
            <div class="flex flex-col items-center">
              <!-- Profile Picture with proper handling -->
              <div class="w-36 h-36 rounded-full overflow-hidden mb-4 border-2 border-theme-primary relative group">
                <img :src="userPhotoUrl" :alt="`${userName}'s profile picture`" class="w-full h-full object-cover" />
                
                <div class="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" @click="openImageSelector">
                  <span class="text-white text-sm font-medium">Change picture</span>
                </div>
                
                <input 
                  type="file" 
                  ref="fileInput" 
                  class="hidden" 
                  accept="image/*" 
                  @change="handleImageUpload" 
                />
              </div>
              
              <h2 class="text-xl font-semibold text-heading mb-1">{{ userName }}</h2>
              <p class="text-text-muted text-sm mb-4">{{ user?.email }}</p>
              
              <button class="w-full bg-theme-primary text-background px-4 py-2 rounded text-sm hover:bg-theme-secondary transition duration-200 mb-2 flex items-center justify-center" @click="isEditing = !isEditing">
                <fa :icon="['fas', isEditing ? 'times' : 'pen']" class="mr-2" />
                {{ isEditing ? 'Cancel Editing' : 'Edit Profile' }}
              </button>
              
              <NuxtLink to="/dashboard" class="w-full border border-border text-text px-4 py-2 rounded text-sm text-center hover:bg-surface transition duration-200 flex items-center justify-center">
                <fa :icon="['fas', 'arrow-left']" class="mr-2" />
                Back to Dashboard
              </NuxtLink>
            </div>
          </div>
          
          <!-- User stats card -->
          <div class="bg-background shadow-lg rounded-lg p-6 form-fade-in animation-delay-200">
            <h3 class="font-medium text-heading mb-4 pb-2 border-b border-border">Account Stats</h3>
            
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-text-muted">Member since</span>
                <span class="text-text font-medium">{{ formatDate(user?.metadata?.creationTime) }}</span>
              </div>
              
              <div class="flex justify-between items-center">
                <span class="text-text-muted">Last sign in</span>
                <span class="text-text font-medium">{{ formatDate(user?.metadata?.lastSignInTime) }}</span>
              </div>
              
              <div class="flex justify-between items-center">
                <span class="text-text-muted">Profile completed</span>
                <div class="flex items-center">
                  <div class="w-24 bg-surface rounded-full h-2 mr-2">
                    <div class="bg-theme-primary h-2 rounded-full" :style="{width: `${profileCompletionPercentage}%`}"></div>
                  </div>
                  <span class="text-text font-medium">{{ profileCompletionPercentage }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Main content area -->
        <div class="lg:col-span-3">
          <!-- User information form -->
          <div class="bg-background shadow-lg rounded-lg p-6 mb-6 form-fade-in">
            <h3 class="font-medium text-xl text-heading mb-4 pb-2 border-b border-border">Personal Information</h3>
            
            <form @submit.prevent="saveProfile" class="space-y-6">
              <!-- Email field with icon -->
              <div>
                <label class="block text-heading font-medium mb-2 text-sm">Email Address</label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <fa :icon="['fas', 'envelope']" class="text-theme-primary" />
                  </span>
                  <div class="bg-surface pl-10 p-3 rounded border border-border flex items-center">
                    <span class="text-text">{{ user?.email }}</span>
                    <span v-if="isEmailVerified" class="ml-auto bg-success bg-opacity-10 text-text text-xs px-2 py-1 rounded">Verified</span>
                    <span v-else class="ml-auto bg-warning bg-opacity-10 text-text text-xs px-2 py-1 rounded">Not Verified</span>
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <p class="text-text-muted text-xs mt-1">Your email address is associated with your login.</p>
                  <button 
                    v-if="!isEmailVerified" 
                    @click="resendVerificationEmail" 
                    class="text-link hover:text-link-hover text-xs mt-1 ml-4"
                    :disabled="isResendingEmail"
                  >
                    <span v-if="isResendingEmail" class="inline-block">
                      <fa :icon="['fas', 'spinner']" class="mr-1 animate-spin" />
                      Sending...
                    </span>
                    <span v-else class="flex">
                      <fa :icon="['fas', 'paper-plane']" class="mr-1" />
                      <p class="hover:underline">Resend Verification</p>
                    </span>
                  </button>
                </div>
              </div>
              
              <!-- Username with AuthFormField -->
              <AuthFormField
                id="username"
                name="username"
                type="text"
                label="Username"
                icon="user"
                placeholder="Enter your username"
                v-model="profileData.username"
                :disabled="!isEditing"
                fieldClass="form-field-1"
              >
                <p class="text-text-muted text-xs mt-1">This is how you'll appear to other users.</p>
              </AuthFormField>
              
              <!-- Profile images selection -->
              <div v-if="isEditing">
                <label class="block text-heading font-medium mb-2 text-sm">Select Profile Image</label>
                <div class="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  <div 
                    v-for="image in profileImages" 
                    :key="image" 
                    @click="selectProfileImage(image)"
                    class="w-16 h-16 rounded-full overflow-hidden border-2 cursor-pointer transition-all hover:scale-105"
                    :class="profileData.profileImage === image ? 'border-theme-primary' : 'border-transparent'"
                  >
                    <img :src="image" alt="Profile option" class="w-full h-full object-cover" />
                  </div>
                  <div
                    @click="openImageSelector"
                    class="w-16 h-16 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-theme-primary"
                  >
                    <fa :icon="['fas', 'plus']" class="text-xl text-text-muted hover:text-theme-primary" />
                  </div>
                </div>
              </div>
              
              <!-- Bio section with AuthFormField-like styling -->
              <div>
                <label for="bio" class="block font-medium text-text mb-2">Bio</label>
                <div class="relative">
                  <fa :icon="['fas', 'comment-alt']" class="absolute left-3 top-3 text-theme-primary z-20" aria-hidden="true" />
                  <textarea 
                    id="bio"
                    v-model="profileData.bio" 
                    :disabled="!isEditing"
                    rows="4"
                    placeholder="Tell us a little about yourself..."
                    class="pl-10 appearance-none rounded relative block w-full px-3 py-2 border bg-surface text-text focus:outline-none focus:z-10 border-border placeholder-text-muted dark:placeholder-opacity-70 focus:ring-theme-primary focus:border-theme-primary"
                  ></textarea>
                </div>
              </div>
              
              <!-- Save button -->
              <div v-if="isEditing" class="flex justify-end pt-2">
                <button 
                  type="submit" 
                  class="bg-theme-primary text-background px-6 py-2 rounded hover:bg-theme-secondary transition duration-200 flex items-center"
                  :disabled="isSaving"
                >
                  <span v-if="isSaving" class="mr-2 animate-spin">
                    <fa :icon="['fas', 'spinner']" />
                  </span>
                  <fa v-else :icon="['fas', 'save']" class="mr-2" />
                  {{ isSaving ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>
          
          <!-- Security section -->
          <div class="bg-background shadow-lg rounded-lg p-6 form-fade-in animation-delay-300">
            <h3 class="font-medium text-xl text-heading mb-4 pb-2 border-b border-border">Security</h3>
            
            <div class="space-y-6">
              <div>
                <div class="flex justify-between items-center mb-2">
                  <h4 class="font-medium text-heading">Password</h4>
                  <button @click="showPasswordReset = !showPasswordReset" class="text-link hover:text-link-hover hover:underline text-sm flex items-center">
                    <fa :icon="['fas', showPasswordReset ? 'chevron-up' : 'key']" class="mr-1" />
                    {{ showPasswordReset ? 'Hide' : 'Change Password' }}
                  </button>
                </div>
                <p class="text-text-muted text-sm">Your password was last changed on {{ lastPasswordReset }}</p>
                
                <!-- Password reset form -->
                <div v-if="showPasswordReset" class="mt-4 p-4 bg-surface rounded-lg border border-border">
                  <div class="space-y-4">
                    <!-- Current Password with AuthFormField -->
                    <AuthFormField
                      id="current-password"
                      name="currentPassword"
                      type="password"
                      label="Current Password"
                      icon="lock"
                      placeholder="Enter current password"
                      v-model="passwordData.currentPassword"
                    />
                    
                    <!-- New Password with AuthFormField -->
                    <AuthFormField
                      id="new-password"
                      name="newPassword"
                      type="password"
                      label="New Password"
                      icon="key"
                      placeholder="Enter new password"
                      v-model="passwordData.newPassword"
                    >
                      <PasswordStrengthIndicator :password="passwordData.newPassword" />
                    </AuthFormField>
                    
                    <!-- Confirm Password with AuthFormField -->
                    <AuthFormField
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      label="Confirm New Password"
                      icon="check"
                      placeholder="Confirm new password"
                      v-model="passwordData.confirmPassword"
                    />
                    
                    <!-- Error message display -->
                    <AuthErrorMessage :message="passwordError" />
                    
                    <div class="flex justify-end space-x-3">
                      <button 
                        class="border border-border text-text px-4 py-2 text-sm rounded hover:bg-surface transition duration-200 flex items-center"
                        @click="showPasswordReset = false"
                      >
                        <fa :icon="['fas', 'times']" class="mr-2" />
                        Cancel
                      </button>
                      <button 
                        class="bg-theme-primary text-background px-4 py-2 text-sm rounded hover:bg-theme-secondary transition duration-200 flex items-center"
                        @click="updatePassword"
                        :disabled="isPasswordUpdating"
                      >
                        <span v-if="isPasswordUpdating" class="mr-2 animate-spin">
                          <fa :icon="['fas', 'spinner']" />
                        </span>
                        <fa v-else :icon="['fas', 'check']" class="mr-2" />
                        Update Password
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 class="font-medium text-heading mb-2">Two-Factor Authentication</h4>
                <p class="text-text-muted text-sm mb-3">Add an extra layer of security to your account</p>
                <button class="border border-border text-text px-4 py-2 rounded text-sm hover:bg-surface transition duration-200 flex items-center">
                  <fa :icon="['fas', 'shield-alt']" class="mr-2" />
                  Setup Two-Factor Authentication
                </button>
              </div>
              
              <div>
                <h4 class="font-medium text-heading mb-2">Account Deletion</h4>
                <p class="text-text-muted text-sm mb-3">Permanently delete your account and all your data</p>
                <button class="border border-error text-error px-4 py-2 rounded text-sm hover:bg-error-light hover:bg-opacity-10 transition duration-200 flex items-center">
                  <fa :icon="['fas', 'trash-alt']" class="mr-2" />
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword as firebaseUpdatePassword, sendEmailVerification } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { showToast } from '~/utils/toast'
import { handleAuthError } from '~/utils/errorHandler'
import AuthFormField from '~/components/auth/AuthFormField.vue'
import AuthErrorMessage from '~/components/auth/AuthErrorMessage.vue'
import PasswordStrengthIndicator from '~/components/auth/PasswordStrengthIndicator.vue'

// Define page meta
definePageMeta({ layout: 'default-authed' })

// Get auth and firebase data
const { user } = useAuth()
const { firestore, auth } = useFirebase()

// UI state
const isEditing = ref(false)
const isSaving = ref(false)
const showPasswordReset = ref(false)
const isPasswordUpdating = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const passwordError = ref('')
const isResendingEmail = ref(false)

// User document reference
const userDoc = ref<any>(null)
const userName = ref('')
const userPhotoUrl = ref('/images/Profile_Pictures/default_profile.jpg')

// Profile data for the form (merged username and displayName)
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
const profileImages = ref([
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
])

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

// Open file selector for custom image upload
function openImageSelector() {
  fileInput.value?.click()
}

// Handle image upload (placeholder - would need actual storage implementation)
function handleImageUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (files && files.length > 0) {
    // This would be where you'd upload to Firebase Storage
    // For now we'll just show a message
    showToast('Custom image upload not implemented yet', 'info')
    
    // Reset the file input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
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

// Password strength computed property
const passwordStrength = computed(() => calculatePasswordStrength(passwordData.newPassword))
const isPasswordStrong = computed(() => passwordStrength.value >= 25) // Matching the register page minimum requirement

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

// Load user data on component mount
onMounted(async () => {
  await loadUserData()
})

// Watch for user changes
watch(() => user.value, async (newUser) => {
  if (newUser) {
    await loadUserData()
  }
})
</script>