import { ref } from 'vue';
import { 
  ref as storageRef, 
  getDownloadURL, 
  uploadBytesResumable,
  deleteObject,
  listAll,
  getBlob,
} from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { useNuxtApp } from '#app';
import { handleStorageError } from '../errorHandler';
import { enforceImageLimit } from './imageLimitUtil';

export const useImageUpload = () => {
  // Access Firebase storage via the provided composable
  const { $storage } = useNuxtApp();
  
  const isUploading = ref(false);
  const uploadProgress = ref(0);
  const uploadError = ref<string | null>(null);

  /**
   * Compresses and resizes an image, cropping to a centered square if necessary,
   * to fit within the specified dimensions and quality. Defaults to 512x512 pixels and 80% quality.
   * @param file - The original image file
   * @param targetWidth - The target width of the output image
   * @param targetHeight - The target height of the output image
   * @param quality - The quality of compression (0 to 1)
   * @returns Promise with the compressed file as a Blob
   */
  const compressAndResizeImage = async (
    file: File,
    targetWidth: number = 512,
    targetHeight: number = 512,
    quality: number = 0.8
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          // Create a canvas to draw and compress the image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not create canvas context'));
            return;
          }

          // Determine the source rectangle (crop area)
          let sourceX = 0;
          let sourceY = 0;
          let sourceWidth = img.width;
          let sourceHeight = img.height;
          const sourceAspectRatio = img.width / img.height;
          const targetAspectRatio = targetWidth / targetHeight;

          // Crop to center if aspect ratios differ significantly
          // This logic crops to the largest centered rectangle matching the target aspect ratio
          if (sourceAspectRatio > targetAspectRatio) {
            // Source image is wider than target: crop width
            sourceWidth = img.height * targetAspectRatio;
            sourceX = (img.width - sourceWidth) / 2;
          } else if (sourceAspectRatio < targetAspectRatio) {
            // Source image is taller than target: crop height
            sourceHeight = img.width / targetAspectRatio;
            sourceY = (img.height - sourceHeight) / 2;
          }
          // If aspect ratios are the same, no cropping needed (sourceX/Y remain 0, sourceWidth/Height remain original)

          // Set canvas dimensions to the target size
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          // Fill with white background (optional, handles transparency)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw the cropped and resized image onto the canvas
          // Arguments: image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight
          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0, // Draw from top-left corner of canvas
            0,
            targetWidth, // Draw to fill target dimensions
            targetHeight
          );
          
          // Convert to JPEG with specified quality
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          }, 'image/jpeg', quality);
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
    });
  };
  
  /**
   * Sanitizes a filename to remove potentially harmful characters
   * @param filename - The original filename
   * @returns Sanitized filename
   */
  const sanitizeFilename = (filename: string): string => {
    // Replace spaces with underscores
    let sanitized = filename.replace(/\s+/g, '_');
    // Remove special characters except underscores, hyphens, and periods
    sanitized = sanitized.replace(/[^\w\-\.]/g, '');
    // Ensure the filename is bellow 50 characters
    return sanitized.substring(0, 50);
  };

  /**
   * Upload an image file to Firebase Storage with validation, optional resizing/cropping,
   * and compression. Progress tracking is implemented.
   * @param file - The file to upload
   * @param path - The storage path (e.g., 'profile_pictures')
   * @param maxSizeInMB - Maximum allowed original file size in MB
   * @param allowedTypes - Array of allowed MIME types
   * @param targetWidth - Target width for resizing (default: 512)
   * @param targetHeight - Target height for resizing (default: 512)
   * @param compressionQuality - Compression quality for JPEG (0-1, default: 0.8)
   * @returns Promise with the download URL or null if failed
   */
  const uploadImage = async (
    file: File,
    path: string = 'profile_pictures',
    maxSizeInMB: number = 5,
    allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    targetWidth: number = 512, // Added parameter
    targetHeight: number = 512, // Added parameter
    compressionQuality: number = 0.8 // Added parameter
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
      
      // Additional security: Validate path to prevent directory traversal
      if (path.includes('..') || path.startsWith('/') || path.includes('\\')) {
        throw new Error('Invalid storage path');
      }
      
      // Update progress to indicate preprocessing has started
      uploadProgress.value = 10;
      
      // ENFORCE IMAGE LIMIT: Delete oldest images if needed before uploading
      await enforceImageLimit($storage, path);
      
      // Compress and resize the image using the provided parameters
      const processedImage = await compressAndResizeImage(
        file,
        targetWidth,
        targetHeight,
        compressionQuality
      );
      
      // Update progress after image processing
      uploadProgress.value = 20;
      
      // Create a unique filename with sanitized original name
      const sanitizedName = sanitizeFilename(file.name);
      const fileName = `${uuidv4()}-${sanitizedName}.jpg`; // Force .jpg extension for compressed image
      
      // Ensure the path is properly sanitized
      const safePath = path.replace(/[^\w\/\-]/g, '');
      const fileRef = storageRef($storage, `${safePath}/${fileName}`);
      
      // Create metadata reflecting the actual processing parameters
      const metadata = {
        contentType: 'image/jpeg', // Explicitly set content type for compressed image
        customMetadata: {
          'originalName': file.name,
          'originalType': file.type,
          'compressed': 'true',
          'compressionQuality': compressionQuality.toString(), 
          'dimensions': `${targetWidth}x${targetHeight}`, 
          'uploadedAt': new Date().toISOString()
        }
      };
      
      // Use uploadBytesResumable to track progress
      return new Promise<string | null>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(fileRef, processedImage, metadata);
        
        // Register progress observer
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Calculate and update progress percentage
            const progress = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 80
            ) + 20; // Add 20% for the preprocessing we've already done
            
            uploadProgress.value = progress;
          },
          (error) => {
            // Handle unsuccessful uploads using the error utility
            const friendlyErrorMessage = handleStorageError(error);
            uploadError.value = friendlyErrorMessage;
            console.error('Upload error:', error);
            resolve(null); 
          },
          async () => {
            // Handle successful upload
            try {
              // Get download URL
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              uploadProgress.value = 100;
              resolve(downloadURL);
            } catch (error) {
              // Use error utility for download error
              const friendlyErrorMessage = handleStorageError(error);
              uploadError.value = friendlyErrorMessage;
              console.error('Download URL error:', error);
              resolve(null);
            }
          }
        );
      });
      
    } catch (error) {
      uploadError.value = error instanceof Error && error.message.includes("Invalid file type") 
        ? error.message  // detailed message for validation errors, ease of debugging
        : handleStorageError(error);
      console.error('Upload error:', error);
      return null; 
    } finally {
      isUploading.value = false;
    }
  };

  return {
    uploadImage,
    isUploading,
    uploadProgress,
    uploadError
  };
};

/**
 * Deletes an uploaded image from Firebase Storage by URL
 * @param imageUrl - The URL of the image to delete
 * @returns Promise resolved when deletion is complete
 */
export const deleteUploadedImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract the path from the URL
    const urlObj = new URL(imageUrl);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+?)(?:\?|$)/);
    
    if (!pathMatch || !pathMatch[1]) {
      console.error('Invalid Firebase Storage URL format:', imageUrl);
      return;
    }
    
    // Decode the path component
    const path = decodeURIComponent(pathMatch[1]);
    
    // Get storage instance
    const { $storage } = useNuxtApp();
    const fileRef = storageRef($storage, path);
    
    // Delete the file
    await deleteObject(fileRef);
  } catch (error) {
    console.error('Error deleting image:', error);
  }
};

/**
 * Cleans up temporary server images for a specific user
 * @param userId - The ID of the user whose temporary images should be cleaned up
 * @returns Promise resolved when cleanup is complete
 */
export const cleanupTempServerImages = async (userId: string): Promise<void> => {
  if (!userId) return;
  
  try {
    // Get storage instance
    const { $storage } = useNuxtApp();
    const tempFolderRef = storageRef($storage, `temp_server_images/${userId}`);
    
    // List all files in the folder
    const fileList = await listAll(tempFolderRef);
    
    // Delete all files in parallel
    await Promise.all(fileList.items.map(fileRef => deleteObject(fileRef)));
    
    console.log(`Cleaned up ${fileList.items.length} temporary server images for user ${userId}`);
  } catch (error) {
    console.error('Error cleaning up temporary server images:', error);
  }
};

/**
 * Moves a server image from temporary location to permanent server images folder
 * @param tempImageUrl - The URL of the temporary image
 * @param serverId - The ID of the server
 * @returns Promise with the new URL of the image in permanent location or null if failed
 */
export const moveServerImageToPermanent = async (tempImageUrl: string, serverId: string): Promise<string | null> => {
  if (!tempImageUrl || !serverId) return null;
  
  try {
    // Extract path from URL
    const urlObj = new URL(tempImageUrl);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+?)(?:\?|$)/);
    
    if (!pathMatch || !pathMatch[1]) {
      console.error('Invalid Firebase Storage URL format:', tempImageUrl);
      return tempImageUrl;
    }
    
    // Decode the path component
    const path = decodeURIComponent(pathMatch[1]);
    
    // Skip if not a temp image
    if (!path.includes('temp_server_images')) {
      return tempImageUrl;
    }
    
    // Get storage instance
    const { $storage } = useNuxtApp();
    
    // Get references
    const tempRef = storageRef($storage, path);
    const fileName = path.split('/').pop() || `${uuidv4()}.jpg`;
    const permanentPath = `server_images/${serverId}/${fileName}`;
    const permanentRef = storageRef($storage, permanentPath);
    
    // Get blob from temp location
    const blob = await getBlob(tempRef);
    
    // Upload to permanent location
    const uploadTask = await uploadBytesResumable(permanentRef, blob);
    const newUrl = await getDownloadURL(uploadTask.ref);
    
    console.log(`Moved server image from ${path} to ${permanentPath}`);
    
    return newUrl;
  } catch (error) {
    console.error('Error moving server image to permanent location:', error);
    return tempImageUrl; // Return original URL if move fails
  }
};