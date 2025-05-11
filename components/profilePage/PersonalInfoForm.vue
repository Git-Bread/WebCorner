<template>
  <div class="bg-background shadow-lg rounded-lg p-6 mb-6 form-fade-in">
    <h3 class="font-medium text-xl text-heading mb-4 pb-2 border-b border-border" id="personal-info-heading">Personal Information</h3>
    
    <!-- Email section is always visible -->
    <div class="mb-3" role="region" aria-labelledby="email-heading">
      <label class="block text-heading font-medium mb-2 text-sm" id="email-heading">Email Address</label>
      <div class="relative">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center">
          <fa :icon="['fas', 'envelope']" class="text-theme-primary" aria-hidden="true" />
        </span>
        <div class="bg-surface pl-10 p-3 rounded border border-border flex items-center">
          <span class="text-text">{{ user?.email || 'No email' }}</span>
          <span v-if="isEmailVerified" class="ml-auto bg-success bg-opacity-10 text-text text-xs px-2 py-1 rounded" role="status">Verified</span>
          <span v-else class="ml-auto bg-warning bg-opacity-10 text-text text-xs px-2 py-1 rounded" role="status">Not Verified</span>
        </div>
      </div>
      <div class="flex items-center justify-between">
        <p class="text-text-muted text-xs mt-1">Your email address is associated with your login.</p>
        <button 
          v-if="!isEmailVerified" 
          @click="resendVerificationEmail" 
          class="text-link hover:text-link-hover text-xs mt-1 ml-4" 
          :disabled="isResendingEmail"
          aria-label="Resend email verification"
        >
          <span v-if="isResendingEmail" class="inline-block">
            <fa :icon="['fas', 'spinner']" class="mr-1 animate-spin" aria-hidden="true" /> Sending...
          </span>
          <span v-else class="flex">
            <fa :icon="['fas', 'paper-plane']" class="mr-1" aria-hidden="true" />
            <p class="hover:underline">Resend Verification</p>
          </span>
        </button>
      </div>
    </div>
    
    <!-- View Mode -->
    <div v-if="!isEditing" class="space-y-4">
      <!-- Display Username, some ugly fixes to make it less jarring when switching between edit and view mode -->
      <div role="region" aria-labelledby="username-display-heading">
        <h4 class="text-heading font-medium mb-2 text-sm" id="username-display-heading">Username</h4>
        <div class="bg-surface p-2 rounded border border-border">
          <div class="flex items-center">
            <fa :icon="['fas', 'user']" class="text-theme-primary mr-3 pl-[0.2em]" aria-hidden="true" />
            <span class="text-text ml-0.5">{{ profileData.username || 'No username set' }}</span>
          </div>
        </div>
      </div>
      
      <!-- Display Bio -->
      <div role="region" aria-labelledby="bio-display-heading">
        <h4 class="text-heading font-medium mb-2 text-sm" id="bio-display-heading">Bio</h4>
        <div class="bg-surface p-3 rounded border border-border">
          <div class="flex">
            <fa :icon="['fas', 'comment-alt']" class="text-theme-primary mr-3 mt-1 flex-shrink-0" aria-hidden="true" />
            <p class="text-text whitespace-pre-line">{{ profileData.bio || 'No bio added yet' }}</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Edit Mode -->
    <form v-else @submit.prevent="handleSubmit" class="space-y-6" aria-labelledby="personal-info-heading">
      <!-- Username with AuthFormField -->
      <AuthFormField id="username" name="username" type="text" label="Username" icon="user" 
        placeholder="Enter your username" v-model="profileData.username">
        <p class="text-text-muted text-xs mt-1">This is how you'll appear to other users.</p>
      </AuthFormField>
      
      <!-- Profile images selection -->
      <div role="region" aria-labelledby="profile-image-heading">
        <label class="block text-heading font-medium mb-2 text-sm" id="profile-image-heading">Select Profile Image</label>
        <div class="grid grid-cols-4 sm:grid-cols-6 gap-3" role="radiogroup" aria-label="Available profile images">
          <!-- Loading state for user images -->
          <div v-if="isLoadingUserImages" class="col-span-4 sm:col-span-6 flex justify-center py-2">
            <div class="flex items-center space-x-2">
              <fa :icon="['fas', 'spinner']" class="animate-spin text-theme-primary" aria-hidden="true" />
              <span class="text-text-muted text-sm">Loading your saved images...</span>
            </div>
          </div>
          
          <!-- User's custom saved images (shown first) -->
          <template v-if="userCustomImages.length > 0">
            <div 
              v-for="image in userCustomImages" 
              :key="image" 
              @click="selectProfileImage(image)"
              class="w-16 h-16 rounded-full overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 relative"
              :class="profileData.profileImage === image ? 'border-theme-primary' : 'border-transparent'"
              role="radio"
              :aria-checked="profileData.profileImage === image"
              tabindex="0"
              @keydown.space.prevent="selectProfileImage(image)"
            >
              <img :src="image" alt="Your saved image" class="w-full h-full object-cover" />
            </div>
          </template>
          
          <!-- Separator between user and default images -->
          <div v-if="userCustomImages.length > 0" class="col-span-4 sm:col-span-6 pt-1 pb-2">
            <div class="border-t border-border relative">
              <span class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-text-muted text-xs">Default options</span>
            </div>
          </div>
          
          <!-- Default profile images -->
          <div 
            v-for="image in defaultProfileImages" 
            :key="image" 
            @click="selectProfileImage(image)"
            class="w-16 h-16 rounded-full overflow-hidden border-2 cursor-pointer transition-all hover:scale-105"
            :class="profileData.profileImage === image ? 'border-theme-primary' : 'border-transparent'"
            role="radio"
            :aria-checked="profileData.profileImage === image"
            tabindex="0"
            @keydown.space.prevent="selectProfileImage(image)"
          >
            <img :src="image" alt="Profile option" class="w-full h-full object-cover" />
          </div>
          
          <!-- Custom upload button -->
          <div 
            @click="triggerFileInput" 
            class="w-16 h-16 rounded-full border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-theme-primary relative overflow-hidden"
            role="button"
            aria-label="Upload custom profile image"
            tabindex="0"
            @keydown.space.prevent="triggerFileInput"
            @keydown.enter.prevent="triggerFileInput"
          >
            <template v-if="isImageUploading">
              <fa :icon="['fas', 'spinner']" class="animate-spin text-theme-primary text-xl" aria-hidden="true" />
              <span class="text-xs mt-1 text-text-muted">Uploading</span>
            </template>
            <template v-else-if="previewImage">
              <img :src="previewImage || ''" alt="Preview" class="absolute inset-0 w-full h-full object-cover" />
              <div class="absolute inset-0 bg-background-primary bg-opacity-40 flex flex-col items-center justify-center">
                <fa :icon="['fas', 'sync']" class="text-white text-xl" aria-hidden="true" />
                <span class="text-xs mt-1 text-white">Change</span>
              </div>
            </template>
            <template v-else>
              <fa :icon="['fas', 'plus']" class="text-xl text-text-muted group-hover:text-theme-primary" aria-hidden="true" />
              <span class="text-xs mt-1 text-text-muted">Custom</span>
            </template>
            
            <!-- Hidden file input -->
            <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" 
                  @change="handleFileSelection" class="hidden" aria-label="Upload profile image" />
          </div>
        </div>
        
        <!-- Error message for image upload -->
        <p v-if="uploadError" class="text-error text-xs mt-2" role="alert">{{ uploadError }}</p>
        
        <!-- Image requirements and limits -->
        <div class="flex justify-between items-center mt-2">
          <p class="text-text-muted text-xs">
            Supported formats: JPEG, PNG, WebP. Max size: {{ maxSizeInMB }}MB.
          </p>
          <p class="text-text-muted text-xs">
            <fa :icon="['fas', 'info-circle']" class="mr-1" aria-hidden="true" />
            Limit: {{ userCustomImages.length }}/5 images
          </p>
        </div>
      </div>
      
      <!-- Image preview modal -->
      <div v-if="showPreviewModal" class="fixed inset-0 bg-background-primary bg-opacity-75 flex items-center justify-center z-50" role="dialog" aria-labelledby="preview-modal-title">
        <div class="bg-background rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <h3 id="preview-modal-title" class="font-medium text-lg text-heading mb-4">Upload Profile Image</h3>
          
          <div class="mb-4 flex justify-center">
            <div class="w-40 h-40 rounded-full overflow-hidden border-2 border-theme-primary">
              <img :src="previewImage || ''" alt="Image Preview" class="w-full h-full object-cover" />
            </div>
          </div>
          
          <!-- File info -->
          <div class="mb-4 text-center">
            <p class="text-text-muted text-sm">{{ selectedFile?.name }}</p>
            <p class="text-text-muted text-xs">{{ formatFileSize(selectedFile?.size) }}</p>
          </div>
          
          <!-- Error message -->
          <p v-if="uploadError" class="text-error text-sm mb-4 text-center" role="alert">{{ uploadError }}</p>
          
          <div class="flex justify-between">
            <button 
              @click="cancelPreview" 
              class="px-4 py-2 border border-border text-text rounded hover:bg-surface transition duration-200"
              aria-label="Cancel image upload"
            >
              Cancel
            </button>
            <button 
              @click="confirmUpload" 
              class="px-4 py-2 bg-theme-primary text-background rounded hover:bg-theme-secondary transition duration-200" 
              :disabled="isImageUploading"
              aria-label="Confirm image upload"
            >
              <span v-if="isImageUploading" class="inline-block mr-2">
                <fa :icon="['fas', 'spinner']" class="animate-spin" aria-hidden="true" />
              </span>
              {{ isImageUploading ? 'Uploading...' : 'Upload' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Bio section -->
      <div>
        <label for="bio" class="block font-medium text-text mb-2">Bio</label>
        <div class="relative">
          <fa :icon="['fas', 'comment-alt']" class="absolute left-3 top-3 text-theme-primary z-20" aria-hidden="true" />
          <textarea id="bio" v-model="profileData.bio" rows="4" placeholder="Tell us a little about yourself..."
            class="pl-10 appearance-none rounded relative block w-full px-3 py-2 border bg-surface text-text focus:outline-none focus:z-10 border-border placeholder-text-muted dark:placeholder-opacity-70 focus:ring-theme-primary focus:border-theme-primary"
            aria-label="Your bio"></textarea>
        </div>
      </div>
      
      <!-- Save button -->
      <div class="flex justify-end pt-2">
        <button 
          type="submit" 
          class="bg-theme-primary text-background px-6 py-2 rounded hover:bg-theme-secondary transition duration-200 flex items-center" 
          :disabled="isSaving || isImageUploading"
          aria-label="Save profile changes"
        >
          <span v-if="isSaving || isImageUploading" class="mr-2 animate-spin"><fa :icon="['fas', 'spinner']" aria-hidden="true" /></span>
          <fa v-else :icon="['fas', 'save']" class="mr-2" aria-hidden="true" />
          {{ isSaving || isImageUploading ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">

// Get auth data and profile composable directly
const { user } = useAuth();
const { 
  profileData,
  profileImages, 
  defaultProfileImages, // Added for access to default images separately
  userCustomImages, // Added for access to user's custom images
  isEditing,
  isSaving,
  isEmailVerified,
  isResendingEmail,
  isImageUploading,
  isLoadingUserImages, // Added loading state for user images
  saveProfile,
  selectProfileImage,
  uploadCustomImage,
  resendVerificationEmail,
  invalidateProfileCache,
} = useProfile();

// For file upload
const fileInput = ref<HTMLInputElement | null>(null);
const uploadError = ref<string | null>(null);
const previewImage = ref<string | null>(null);
const maxSizeInMB = 5; // Setting to 5MB to match upload limit in useProfile.ts
const showPreviewModal = ref(false);
const selectedFile = ref<File | null>(null);

// Open file dialog
function triggerFileInput() {
  if (fileInput.value) {
    fileInput.value.click();
  }
}

// Format file size for display
function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 Bytes';
  
  if (bytes < 1024) return bytes + ' Bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Handle initial file selection
function handleFileSelection(event: Event) {
  uploadError.value = null;
  
  const target = event.target as HTMLInputElement;
  const files = target.files;
  
  if (!files || files.length === 0) {
    return;
  }
  
  const file = files[0];
  selectedFile.value = file;
  
  // Validate file size before preview
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  
  if (file.size > maxSizeInBytes) {
    uploadError.value = `File size exceeds maximum allowed size of ${maxSizeInMB}MB`;
    showPreviewModal.value = true;
    return;
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    uploadError.value = 'Invalid file type. Allowed types: JPEG, PNG, WebP';
    showPreviewModal.value = true;
    return;
  }
  
  // Generate preview and show modal
  previewImage.value = URL.createObjectURL(file);
  showPreviewModal.value = true;
  
  // Reset the input to allow selecting the same file again if needed
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

// Cancel preview and close modal
function cancelPreview() {
  showPreviewModal.value = false;
  previewImage.value = null;
  selectedFile.value = null;
  uploadError.value = null;
}

// Confirm and start upload
async function confirmUpload() {
  if (!selectedFile.value || uploadError.value) return;
  
  try {
    // Double-check file size before upload
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (selectedFile.value.size > maxSizeInBytes) {
      uploadError.value = `File size exceeds maximum allowed size of ${maxSizeInMB}MB`;
      return;
    }
    
    // Upload the image
    await uploadCustomImage(selectedFile.value);
    
    // Close modal after successful upload
    showPreviewModal.value = false;
  } catch (error) {
    console.error('Error uploading image:', error);
    uploadError.value = 'Failed to upload image';
  }
}

// Handle form submission
async function handleSubmit() {
  // Save the profile data
  await saveProfile();
  
  // Clear any preview image
  previewImage.value = '';
  
  // Force a cache refresh for other components that might be using the profile data
  invalidateProfileCache();
}
</script>