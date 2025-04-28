<template>
  <div class="min-h-[90vh] bg-gradient-page py-8 px-4">
    <div class="container mx-auto">
      <!-- Page header with user's name -->
      <ProfileHeader 
        :displayName="(user?.displayName || userName || 'My Profile')" 
      />
      
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <!-- Left sidebar with avatar and quick stats -->
        <div class="lg:col-span-1">
          <ProfileSidebar
            :userName="userName"
            :userEmail="user?.email || null"
            :userPhotoUrl="userPhotoUrl"
            :isEditing="isEditing"
            :isSaving="isSaving"
            :isEmailVerified="!!isEmailVerified"
            :isResendingEmail="isResendingEmail"
            :profileData="profileData"
            :profileImages="profileImages"
            :creationTime="formatUserDate(user?.metadata?.creationTime)"
            :lastSignInTime="formatUserDate(user?.metadata?.lastSignInTime)"
            :profileCompletionPercentage="profileCompletionPercentage"
            @toggleEditing="toggleEditing"
            @openImageSelector="openImageSelector"
          />
        </div>
        
        <!-- Main content area -->
        <div class="lg:col-span-3">
          <!-- User information form -->
          <PersonalInfoForm
            :userEmail="user?.email || null"
            :isEditing="isEditing"
            :isSaving="isSaving"
            :isEmailVerified="!!isEmailVerified"
            :isResendingEmail="isResendingEmail"
            :profileData="profileData"
            :profileImages="profileImages"
            @saveProfile="saveProfile"
            @selectProfileImage="selectProfileImage"
            @openImageSelector="openImageSelector"
            @resendVerificationEmail="resendVerificationEmail"
          />
          
          <!-- Security settings section -->
          <SecuritySettings
            :showPasswordReset="showPasswordReset"
            :passwordData="passwordData"
            :passwordError="passwordError"
            :lastPasswordReset="lastPasswordReset"
            :isPasswordUpdating="isPasswordUpdating"
            @togglePasswordReset="togglePasswordReset"
            @updatePassword="updatePassword"
          />
        </div>
      </div>

      <!-- Hidden file input for image upload -->
      <input 
        type="file" 
        ref="fileInput" 
        class="hidden" 
        accept="image/*" 
        @change="handleImageUpload" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { showToast } from '~/utils/toast'

// Import components
import ProfileHeader from '~/components/profilePage/ProfileHeader.vue'
import ProfileSidebar from '~/components/profilePage/ProfileSidebar.vue'
import PersonalInfoForm from '~/components/profilePage/PersonalInfoForm.vue'
import SecuritySettings from '~/components/profilePage/SecuritySettings.vue'

// Define page meta
definePageMeta({ layout: 'default-authed' })

// Get auth data and profile composable
const { user } = useAuth()
const profileState = useProfile()
const fileInput = ref<HTMLInputElement | null>(null)

// Unwrap reactive values from profileState for template use
const userName = computed(() => profileState.userName.value)
const userPhotoUrl = computed(() => profileState.userPhotoUrl.value)
const isEditing = computed(() => profileState.isEditing.value)
const isSaving = computed(() => profileState.isSaving.value)
const isEmailVerified = computed(() => profileState.isEmailVerified.value)
const isResendingEmail = computed(() => profileState.isResendingEmail.value)
const showPasswordReset = computed(() => profileState.showPasswordReset.value)
const passwordError = computed(() => profileState.passwordError.value)
const isPasswordUpdating = computed(() => profileState.isPasswordUpdating.value)
const profileCompletionPercentage = computed(() => profileState.profileCompletionPercentage.value)
const lastPasswordReset = computed(() => profileState.lastPasswordReset.value)
const profileImages = computed(() => profileState.profileImages)
const profileData = computed(() => profileState.profileData)
const passwordData = computed(() => profileState.passwordData)

// Wrapper functions for methods
const formatUserDate = (dateString?: string) => profileState.formatDate(dateString)
const saveProfile = () => profileState.saveProfile()
const selectProfileImage = (image: string) => profileState.selectProfileImage(image)
const resendVerificationEmail = () => profileState.resendVerificationEmail()
const updatePassword = () => profileState.updatePassword()
const toggleEditing = () => profileState.isEditing.value = !profileState.isEditing.value
const togglePasswordReset = () => profileState.showPasswordReset.value = !profileState.showPasswordReset.value

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

// Load user data on component mount
onMounted(async () => {
  await profileState.loadUserData()
})
</script>