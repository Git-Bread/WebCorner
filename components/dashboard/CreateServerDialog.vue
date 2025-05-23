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
      
      <!-- Form Container -->
      <form 
        class="p-6 overflow-y-auto"
        @submit.prevent="handleCreateServer"
      >
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
        <div class="mt-6 flex justify-end space-x-3">
          <button 
            type="button" 
            class="px-4 py-2 rounded-md text-text border border-border bg-surface hover:bg-background"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button 
            type="button"
            class="px-4 py-2 rounded-md bg-theme-primary text-background hover:bg-opacity-90 flex items-center"
            :disabled="!serverData.name.trim() || props.isCreating"
            @click="handleCreateServer"
          >
            <fa 
              v-if="props.isCreating" 
              :icon="['fas', 'spinner']" 
              class="animate-spin mr-2" 
            />
            <span>{{ props.isCreating ? 'Creating...' : 'Create Server' }}</span>
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
import { library } from '@fortawesome/fontawesome-svg-core';
import { faTimes, faImage, faSpinner, faExchangeAlt, faUpload, faTrashAlt, faServer } from '@fortawesome/free-solid-svg-icons';
import { serverImageCache } from '~/utils/storageUtils/imageCacheUtil';
import { showToast } from '~/utils/toast';

library.add(faTimes, faImage, faSpinner, faExchangeAlt, faUpload, faTrashAlt, faServer);

const props = defineProps<{
  isOpen: boolean;
  isCreating: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'create', serverInfo: {
    name: string;
    description: string;
    server_img_url: string | null;
    maxMembers: number;
    components: Record<string, boolean>
  }): void;
}>();

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

// Handle the create server button click
const handleCreateServer = async () => {
  if (!serverData.name.trim()) {
    uploadError.value = "Server name is required";
    return;
  }
  
  // Emit the create event to the parent with server information
  emit('create', {
    name: serverData.name,
    description: serverData.description,
    server_img_url: serverData.imageUrl || null,
    maxMembers: serverData.maxMembers,
    components: serverData.components
  });
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