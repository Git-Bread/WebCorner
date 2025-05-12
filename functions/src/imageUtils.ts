import * as admin from 'firebase-admin';

/**
 * Helper function to extract the path from a Firebase Storage URL
 * @param imageUrl - The Firebase Storage URL
 * @returns The extracted path or null if invalid format
 */
export const extractPathFromUrl = (imageUrl: string): string | null => {
  try {
    // Extract the path from the URL
    const urlObj = new URL(imageUrl);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+?)(?:\?|$)/);
    
    if (!pathMatch || !pathMatch[1]) {
      console.error('Invalid Firebase Storage URL format:', imageUrl);
      return null;
    }
    
    // Decode the path component
    return decodeURIComponent(pathMatch[1]);
  } catch (error) {
    console.error('Error extracting path from URL:', error);
    return null;
  }
};

/**
 * Moves a server image from temporary location to permanent server images folder
 * Server-side implementation for use in Cloud Functions
 * 
 * @param tempImageUrl - The URL of the temporary image
 * @param serverId - The ID of the server
 * @returns Promise with the new URL of the image in permanent location or null if failed
 */
export const moveServerImageToPermanent = async (
  tempImageUrl: string, 
  serverId: string
): Promise<string | null> => {
  if (!tempImageUrl || !serverId) return null;
  
  try {
    const bucket = admin.storage().bucket();
    
    // Extract path from URL
    const path = extractPathFromUrl(tempImageUrl);
    if (!path) return null;
    
    // Skip if not a temp image
    if (!path.includes('temp_server_images')) {
      return tempImageUrl;
    }
    
    // Define permanent path with standard naming convention (not using original filename)
    const permanentPath = `server_images/${serverId}/icon.jpg`;
    
    // Move the file to the permanent location
    await bucket.file(path).move(permanentPath);
    
    // Set proper metadata for the file after moving it
    await bucket.file(permanentPath).setMetadata({
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000' // Cache for 1 year
    });
    
    // Generate a public URL without authentication tokens
    // This avoids token expiration issues and browser security blocks
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${permanentPath}`;
    
    console.log(`Server image moved to permanent location: ${permanentPath}`);
    
    return publicUrl;
  } catch (error) {
    console.error('Error moving image to permanent location:', error);
    return null;
  }
};

/**
 * Cleans up temporary server images for a specific user
 * Server-side implementation for use in Cloud Functions
 * 
 * @param userId - The ID of the user whose temporary images should be cleaned up
 * @returns Promise resolved when cleanup is complete
 */
export const cleanupTempServerImages = async (userId: string): Promise<void> => {
  if (!userId) return;
  
  try {
    const bucket = admin.storage().bucket();
    const prefix = `temp_server_images/${userId}/`;
    
    // List all files in the folder
    const [files] = await bucket.getFiles({ prefix });
    
    // Delete all files in parallel
    if (files.length > 0) {
      await Promise.all(files.map(file => file.delete()));
      console.log(`Cleaned up ${files.length} temporary server images for user ${userId}`);
    }
  } catch (error) {
    console.error('Error cleaning up temporary server images:', error);
  }
};