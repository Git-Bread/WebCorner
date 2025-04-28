<template>
  <div>
    <!-- Hidden file input controlled by parent -->
    <input 
      type="file" 
      ref="fileInputRef"
      class="hidden" 
      accept="image/*" 
      @change="handleFileSelected" 
    />
    
    <!-- Upload progress overlay -->
    <div v-if="isUploading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-background p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 class="text-xl font-bold text-heading mb-4">Uploading Image</h2>
        
        <div class="relative pt-1">
          <div class="flex mb-2 items-center justify-between">
            <div>
              <span class="text-xs font-semibold inline-block py-1 px-2 rounded-full text-theme-primary bg-theme-primary bg-opacity-20">
                {{ Math.round(uploadProgress) }}%
              </span>
            </div>
          </div>
          <div class="overflow-hidden h-2 mb-4 text-xs flex rounded bg-surface">
            <div :style="{ width: `${uploadProgress}%` }" class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-theme-primary transition-all duration-300"></div>
          </div>
        </div>
        
        <p class="text-text-muted text-sm">Please don't close this page while your image is uploading...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { showToast } from '~/utils/toast';

const props = defineProps({
  userId: {
    type: String,
    required: true
  }
});

const emit = defineEmits<{
  (e: 'upload-complete', url: string): void;
  (e: 'upload-error', error: string): void;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);
const uploadProgress = ref(0);

// Method to open file dialog
const openFileDialog = () => {
  fileInputRef.value?.click();
};

// Handle the selected file
const handleFileSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  
  if (!files || files.length === 0) return;
  
  const file = files[0];
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    showToast('Please select an image file', 'error');
    resetInput();
    return;
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image must be less than 5MB', 'error');
    resetInput();
    return;
  }
  
  await uploadFile(file);
};

// Upload file to Firebase Storage
const uploadFile = async (file: File) => {
  try {
    isUploading.value = true;
    uploadProgress.value = 0;
    
    const storage = getStorage();
    const timestamp = new Date().getTime();
    const fileName = `profile_images/${props.userId}/${timestamp}_${file.name}`;
    const fileRef = storageRef(storage, fileName);
    
    // Create upload task
    const uploadTask = uploadBytesResumable(fileRef, file);
    
    // Listen for state changes
    uploadTask.on('state_changed', 
      (snapshot) => {
        // Update progress
        uploadProgress.value = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      },
      (error) => {
        // Handle errors
        console.error('Upload failed:', error);
        showToast('Image upload failed', 'error');
        emit('upload-error', 'Upload failed');
        resetInput();
        isUploading.value = false;
      },
      async () => {
        // Handle successful upload
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          showToast('Image uploaded successfully', 'success');
          emit('upload-complete', downloadURL);
        } catch (error) {
          console.error('Error getting download URL:', error);
          showToast('Error retrieving uploaded image', 'error');
          emit('upload-error', 'Failed to get download URL');
        } finally {
          resetInput();
          isUploading.value = false;
        }
      }
    );
  } catch (error) {
    console.error('Upload setup error:', error);
    showToast('Failed to start upload', 'error');
    emit('upload-error', 'Upload setup failed');
    resetInput();
    isUploading.value = false;
  }
};

// Reset file input
const resetInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

// Expose methods to parent
defineExpose({
  openFileDialog
});
</script>