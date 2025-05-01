import { 
  ref as storageRef,
  listAll,
  deleteObject,
  type StorageReference,
  getMetadata,
  getDownloadURL
} from 'firebase/storage';

/**
 * Maximum number of images a user can have stored in each directory
 * When exceeded, the oldest image will be deleted
 */
export const MAX_USER_IMAGES = 5;

/**
 * Gets a list of existing images in a specific path
 * @param storage Firebase Storage instance
 * @param path The storage path to check (e.g. 'profile_pictures/userId')
 * @returns Array of objects containing reference and creation time
 */
export const getUserImages = async (
  storage: any,
  path: string
): Promise<{ ref: StorageReference, createdAt: Date }[]> => {
  try {
    // Create a reference to the folder
    const folderRef = storageRef(storage, path);
    
    // List all items in the path
    const result = await listAll(folderRef);
    
    // Get metadata for each item to determine creation time
    const imagesWithMetadata = await Promise.all(
      result.items.map(async (itemRef) => {
        try {
          const metadata = await getMetadata(itemRef);
          const createdAt = metadata.timeCreated 
            ? new Date(metadata.timeCreated)
            : new Date(); // Fallback to current time if not available
          
          return { ref: itemRef, createdAt };
        } catch (error) {
          console.error(`Error getting metadata for ${itemRef.fullPath}:`, error);
          // If we can't get metadata, use current date as fallback
          return { ref: itemRef, createdAt: new Date() };
        }
      })
    );
    
    return imagesWithMetadata;
    
  } catch (error) {
    console.error('Error listing images:', error);
    return [];
  }
};

/**
 * Deletes the oldest images if the user has exceeded the maximum allowed
 * @param storage Firebase Storage instance
 * @param path The storage path for the user's images
 * @param maxImages Maximum number of images allowed (defaults to MAX_USER_IMAGES)
 * @returns Number of images deleted
 */
export const enforceImageLimit = async (
  storage: any,
  path: string,
  maxImages: number = MAX_USER_IMAGES
): Promise<number> => {
  try {
    // Get all existing images for the user
    const userImages = await getUserImages(storage, path);
    
    if (userImages.length >= maxImages) {
      // Sort images by creation date (oldest first)
      const sortedImages = userImages.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );
      
      // Calculate how many images need to be deleted
      const imagesToDelete = sortedImages.slice(0, userImages.length - maxImages + 1);
      
      // Delete the oldest images
      console.log(`Deleting ${imagesToDelete.length} old images`);
      
      for (const image of imagesToDelete) {
        try {
          await deleteObject(image.ref);
          console.log(`Deleted old image: ${image.ref.fullPath}`);
        } catch (deleteError) {
          console.error(`Failed to delete image ${image.ref.fullPath}:`, deleteError);
        }
      }
      
      return imagesToDelete.length;
    }
    
    return 0;
  } catch (error) {
    console.error('Error enforcing image limit:', error);
    return 0;
  }
};

/**
 * Checks if user has reached the image limit
 * @param storage Firebase Storage instance
 * @param path The storage path for the user's images
 * @param maxImages Maximum number of images allowed (defaults to MAX_USER_IMAGES)
 * @returns Boolean indicating if limit is reached
 */
export const hasReachedImageLimit = async (
  storage: any,
  path: string,
  maxImages: number = MAX_USER_IMAGES
): Promise<boolean> => {
  try {
    const userImages = await getUserImages(storage, path);
    return userImages.length >= maxImages;
  } catch (error) {
    console.error('Error checking image limit:', error);
    return false; // Fail open to allow upload attempt
  }
};