<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-background rounded-lg shadow-xl p-6 max-w-3xl w-full">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-semibold text-heading">Create New Server</h2>
        <button 
          @click="$emit('close')" 
          class="text-text-muted hover:text-text"
          aria-label="Close dialog"
        >
          <fa :icon="['fas', 'times']" class="text-xl" />
        </button>
      </div>
      
      <form @submit.prevent="handleCreate">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Left Column - Server Image + Basic Info -->
          <div class="space-y-6">
            <!-- Server Image -->
            <div>
              <label class="block text-text font-medium mb-2">Server Image</label>
              
              <!-- Image Preview -->
              <div class="mb-4">
                <div 
                  class="w-full h-32 mx-auto rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center overflow-hidden relative"
                  :class="{ 'border-solid border-theme-primary': serverData.image || imagePreview }"
                >
                  <img 
                    v-if="imagePreview" 
                    :src="imagePreview" 
                    alt="Server image preview" 
                    class="w-full h-full object-cover"
                  />
                  <div v-else class="flex flex-col items-center justify-center p-4 text-center h-full w-full">
                    <fa :icon="['fas', 'image']" class="text-4xl mb-2 text-text-muted" />
                    <span class="text-text-muted text-sm">No image selected</span>
                  </div>
                  
                  <!-- Loading Overlay -->
                  <div 
                    v-if="isUploading" 
                    class="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center"
                  >
                    <fa :icon="['fas', 'spinner']" class="text-2xl text-background animate-spin" />
                    <p class="text-background mt-2">{{ uploadProgress }}%</p>
                  </div>
                </div>
              </div>
              
              <!-- Image Upload Controls -->
              <div class="flex flex-col space-y-2">
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  class="hidden"
                  @change="onFileSelected"
                />
                
                <button
                  type="button"
                  @click="triggerFileInput"
                  class="px-4 py-2 bg-surface hover:bg-background border border-border rounded-md text-text transition-colors flex items-center justify-center"
                  :disabled="isUploading"
                >
                  <fa :icon="['fas', imagePreview ? 'exchange-alt' : 'upload']" class="mr-2" />
                  {{ imagePreview ? 'Change Image' : 'Upload Image' }}
                </button>
                
                <button
                  v-if="imagePreview"
                  type="button"
                  @click="clearImage"
                  class="px-4 py-2 text-error hover:bg-error-light rounded-md transition-colors text-sm flex items-center justify-center"
                  :disabled="isUploading"
                >
                  <fa :icon="['fas', 'trash-alt']" class="mr-2" />
                  Remove Image
                </button>
                
                <p v-if="uploadError" class="text-error text-sm mt-1">{{ uploadError }}</p>
                <p class="text-text-muted text-sm">Recommended: 1280x400px (max 5MB)</p>
              </div>
            </div>
            
            <!-- Max Members -->
            <div>
              <label for="maxMembers" class="block text-text font-medium mb-1">Maximum Members</label>
              <input
                id="maxMembers"
                v-model.number="serverData.maxMembers"
                type="number"
                min="1"
                max="1000"
                class="w-full p-2 border border-border rounded-md bg-surface text-text"
              />
              <p class="text-text-muted text-sm mt-1">Default: 100</p>
            </div>
          </div>
          
          <!-- Right Column - Server Details -->
          <div class="space-y-6">
            <!-- Server Name -->
            <div>
              <label for="serverName" class="block text-text font-medium mb-1">Server Name*</label>
              <input
                id="serverName"
                v-model="serverData.name"
                type="text"
                class="w-full p-2 border border-border rounded-md bg-surface text-text"
                placeholder="Enter server name"
                required
              />
              <p class="text-text-muted text-sm mt-1">3-50 characters</p>
            </div>
            
            <!-- Server Description -->
            <div>
              <label for="serverDescription" class="block text-text font-medium mb-1">Description</label>
              <textarea
                id="serverDescription"
                v-model="serverData.description"
                class="w-full p-2 border border-border rounded-md bg-surface text-text"
                placeholder="Describe your server"
                rows="4"
              ></textarea>
              <p class="text-text-muted text-sm mt-1">Optional, up to 500 characters</p>
            </div>
            
            <!-- Server Features -->
            <div>
              <label class="block text-text font-medium mb-2">Server Features</label>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input type="checkbox" v-model="serverData.components.news" class="mr-2" />
                  <span class="text-text">Enable News & Announcements</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" v-model="serverData.components.groups" class="mr-2" />
                  <span class="text-text">Enable Member Groups</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" v-model="serverData.components.chat" class="mr-2" />
                  <span class="text-text">Enable Chat</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Form Footer -->
        <div class="flex justify-end space-x-3 mt-8 pt-4 border-t border-border">
          <button
            type="button"
            @click="$emit('close')"
            class="px-6 py-2 border border-border rounded-md text-text hover:bg-surface transition-all flex items-center"
            :disabled="isUploading || isCreatingServer"
          >
            <fa :icon="['fas', 'times']" class="mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isUploading || isCreatingServer"
            class="px-6 py-2 bg-theme-primary text-background rounded-md hover:bg-opacity-90 transition-all flex items-center"
          >
            <fa v-if="isCreatingServer" :icon="['fas', 'spinner']" class="mr-2 animate-spin" />
            <fa v-else :icon="['fas', 'server']" class="mr-2" />
            <span v-if="isCreatingServer">Creating...</span>
            <span v-else>Create Server</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { useImageUpload, deleteUploadedImage } from '~/utils/imageUtils/imageUploadUtils';
import { useAuth } from '~/composables/useAuth';
import { useServerCore } from '~/composables/server';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faTimes, faImage, faSpinner, faExchangeAlt, faUpload, faTrashAlt, faServer } from '@fortawesome/free-solid-svg-icons';
import { serverImageCache } from '~/utils/storageUtils/imageCacheUtil';
import { showToast } from '~/utils/toast';

library.add(faTimes, faImage, faSpinner, faExchangeAlt, faUpload, faTrashAlt, faServer);

const props = defineProps<{
  isOpen: boolean;
}>();

// Use the server composables directly
const { createServer, isCreatingServer, loadUserServerList, setCurrentServer } = useServerCore();

const serverData = reactive({
  name: '',
  description: '',
  image: null as File | null,
  imageUrl: '',
  maxMembers: 100,
  components: {
    news: true,
    groups: true,
    chat: true
  }
});

const fileInput = ref<HTMLInputElement | null>(null);
const imagePreview = ref<string | null>(null);

// method to trigger the file input click
const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

// Image upload handling
const { uploadImage, isUploading, uploadProgress, uploadError } = useImageUpload();

// File selection handler
const onFileSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  
  if (files && files.length > 0) {
    const file = files[0];
    
    // Store the old image URL to delete later if there is one
    const oldImageUrl = serverData.imageUrl;
    
    // Update local state
    serverData.image = file;
    
    // Create temporary preview
    imagePreview.value = URL.createObjectURL(file);
    
    // Get current user ID for the temp storage path
    const { user } = useAuth();
    const userId = user.value?.uid;
    
    if (!userId) {
      uploadError.value = "You must be logged in to upload images";
      clearImage();
      return;
    }
    
    // Upload the image to Firebase Storage in temp folder with user ID
    const downloadUrl = await uploadImage(
      file,
      `temp_server_images/${userId}`,
      5, // 5MB max
      ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      1280, // width 
      400,  // height
      0.85  // quality
    );
    
    if (downloadUrl) {
      // If upload successful, set new URL
      serverData.imageUrl = downloadUrl;
      
      // Cache the server image URL (using a temporary ID for now)
      serverImageCache.cacheServerImage('temp_server', downloadUrl);
      
      // Delete the old image if it exists
      if (oldImageUrl) {
        await deleteUploadedImage(oldImageUrl);
      }
    } else {
      // Clear image if upload failed
      clearImage();
    }
  }
};

// Clear image selection
const clearImage = async () => {
  // Store the image URL to delete
  const imageUrlToDelete = serverData.imageUrl;
  
  // Clear local state
  serverData.image = null;
  serverData.imageUrl = '';
  imagePreview.value = null;
  if (fileInput.value) fileInput.value.value = '';
  
  // Delete the image from storage if it exists
  if (imageUrlToDelete) {
    await deleteUploadedImage(imageUrlToDelete);
  }
};

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const handleCreate = async () => {
  try {
    // Create server using the composable
    const newServerId = await createServer({
      name: serverData.name,
      description: serverData.description,
      server_img_url: serverData.imageUrl || null,
      maxMembers: serverData.maxMembers,
      components: serverData.components
    });
    
    // Successful server creation
    if (typeof newServerId === 'string') {
      // Check if it's an error message (contains "Failed" or "Error")
      if (newServerId.includes('Failed') || newServerId.includes('Error') || newServerId.includes('error')) {
        showToast(newServerId, 'error');
      } else {
        // It's a valid server ID - close the dialog and show success
        emit('close');
        
        // Select the newly created server
        await setCurrentServer(newServerId);
        
        // Show success toast notification
        showToast(`Server "${serverData.name}" created successfully!`, 'success', 3000);
      }
    }
  } catch (error) {
    console.error('Error creating server:', error);
    showToast('Failed to create server', 'error');
  }
};

// Reset form when dialog is opened
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    serverData.name = '';
    serverData.description = '';
    serverData.image = null;
    serverData.imageUrl = '';
    serverData.maxMembers = 100;
    serverData.components = {
      news: true,
      groups: true,
      chat: true
    };
    imagePreview.value = null;
  }
});
</script>