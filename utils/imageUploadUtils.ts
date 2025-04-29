import { ref } from 'vue';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

export const useImageUpload = () => {
  // Access Firebase storage via the provided composable
  const { $storage } = useNuxtApp();
  
  const isUploading = ref(false);
  const uploadProgress = ref(0);
  const uploadError = ref<string | null>(null);

  /**
   * Upload an image file to Firebase Storage with size and type validation
   * @param file - The file to upload
   * @param path - The storage path to save the file to
   * @param maxSizeInMB - Maximum allowed file size in MB (default: 5MB)
   * @param allowedTypes - Array of allowed MIME types (default: common image formats)
   * @returns Promise with the download URL or null if failed
   */
  const uploadImage = async (
    file: File, 
    path: string = 'profile_pictures', 
    maxSizeInMB: number = 5,
    allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ): Promise<string | null> => {
    // Reset states
    isUploading.value = true;
    uploadProgress.value = 0;
    uploadError.value = null;
    
    try {
      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
      }
      
      // Validate file size
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        throw new Error(`File size exceeds maximum allowed size of ${maxSizeInMB}MB`);
      }
      
      // Create a unique filename
      const fileName = `${uuidv4()}-${file.name.replace(/\s+/g, '_')}`;
      const fileRef = storageRef($storage, `${path}/${fileName}`);
      
      // Upload the file
      const snapshot = await uploadBytes(fileRef, file);
      
      // Get and return download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      uploadError.value = error instanceof Error ? error.message : 'Unknown error occurred during upload';
      console.error('Upload error:', error);
      return null;
    } finally {
      isUploading.value = false;
      uploadProgress.value = 100; // For simplicity in this bare-bones version
    }
  };

  return {
    uploadImage,
    isUploading,
    uploadProgress,
    uploadError
  };
};