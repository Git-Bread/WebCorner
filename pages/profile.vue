<template>
  <div class="min-h-screen py-8 px-4">
    <div class="container mx-auto">
      <!-- Page header with user's name -->
      <ProfileHeader 
        :displayName="profileDisplayName" 
      />
      
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <!-- Left sidebar with avatar and quick stats -->
        <div class="lg:col-span-1">
          <ProfileSidebar 
            :userName="userName"
            :userPhotoUrl="userPhotoUrl"
            :userEmail="user?.email || ''"
            :isEditing="isEditing"
            :tempProfileImage="tempProfileImage"
            :profileCompletionPercentage="profileCompletionPercentage"
            :creationTime="user?.metadata?.creationTime"
            :lastSignInTime="user?.metadata?.lastSignInTime"
            @toggle-editing="toggleEditing"
          />
        </div>
        
        <!-- Main content area -->
        <div class="lg:col-span-3">
          <!-- User information form -->
          <PersonalInfoForm 
            :user="user || {}"
            :isEditing="isEditing"
            :isEmailVerified="isEmailVerified"
            :profileData="profileData"
            :isResendingEmail="isResendingEmail"
            :isLoadingUserImages="isLoadingUserImages"
            :userCustomImages="userCustomImages"
            :isImageUploading="isImageUploading"
            :uploadError="uploadError || ''"
            :isSaving="isSaving"
            @resend-verification="resendVerificationEmail"
            @select-profile-image="selectProfileImage"
            @upload-image="uploadCustomImage"
            @save-profile="saveProfile"
          />
          
          <!-- Security settings section -->
          <SecuritySettings 
            :lastPasswordReset="lastPasswordReset"
            :isDeleting="isDeleting"
            :deleteError="deleteError || ''"
            @update-password="updatePassword"
            @delete-account="deleteAccount"
            @reset-delete-state="resetDeleteState"
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
import { computed, ref, onMounted, inject } from 'vue'
definePageMeta({ layout: 'default-authed' })

// Import components
import ProfileHeader from '~/components/profilePage/ProfileHeader.vue'
import ProfileSidebar from '~/components/profilePage/ProfileSidebar.vue'
import PersonalInfoForm from '~/components/profilePage/PersonalInfoForm.vue'
import SecuritySettings from '~/components/profilePage/SecuritySettings.vue'
import { useImageUpload } from '~/utils/imageUtils/imageUploadUtils'

// Get the profile data from the provider
// This should be the singleton instance from the layout
const injectedData = inject<{ 
  profileState: ReturnType<typeof useProfile>; 
  loadingProfileData: Ref<boolean>;
}>('userProfileData');

// Use the shared singleton instance, falling back to a direct call if needed
// Due to the singleton pattern, this will reuse the same instance anyway
const profile = injectedData?.profileState || useProfile();
const loadingProfileData = injectedData?.loadingProfileData;

// Get auth data
const { user } = useAuth();

// Import only what's needed from utils
const { uploadError } = useImageUpload();

// Destructure the properties and methods from the profile state
const {
  userName, 
  userPhotoUrl,
  profileData,
  isEditing,
  isSaving,
  isImageUploading,
  isLoadingUserImages,
  isResendingEmail,
  tempProfileImage,
  userCustomImages,
  profileCompletionPercentage,
  lastPasswordReset,
  isDeleting,
  deleteError,
  defaultProfileImages,
  loadUserData,
  saveProfile,
  selectProfileImage,
  uploadCustomImage,
  resendVerificationEmail,
  updatePassword,
  deleteAccount
} = profile;

// Computed properties for child components
const profileDisplayName = computed(() => 
  user.value?.displayName || userName.value || 'My Profile'
);

const isEmailVerified = computed(() => 
  user.value?.emailVerified || false
);

// Reference to file input for image uploads
const fileInput = ref<HTMLInputElement | null>(null);

// Handle image upload
function handleImageUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  
  if (files && files.length > 0) {
    uploadCustomImage(files[0]).then(() => {
      // Reset the file input after successful upload
      if (fileInput.value) {
        fileInput.value.value = '';
      }
    });
  }
}

// Toggle editing state
function toggleEditing() {
  isEditing.value = !isEditing.value;
}

// Reset delete state
function resetDeleteState() {
  isDeleting.value = false;
  deleteError.value = '';
}
</script> 