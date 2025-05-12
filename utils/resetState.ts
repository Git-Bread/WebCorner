import { clearCache, clearUserCaches } from './storageUtils/cacheUtil';

/**
 * Reset all application state
 * This function combines our various cache clearing and state resetting operations
 * @param userId Optional user ID to target specific user caches
 */
export const resetAppState = (userId?: string): void => {
  // 1. Clear all caches including localStorage
  clearCache(true);
  clearUserCaches(userId);
  
  useState('profile-userName').value = '';
  useState('profile-userPhotoUrl').value = '/images/Profile_Pictures/default_profile.jpg';
  useState('profile-data').value = { username: '', bio: '', profileImage: '' };
  useState('profile-tempImage').value = '';
  useState('profile-userCustomImages').value = [];
  useState('profile-isEditing').value = false;
  useState('profile-isSaving').value = false;
  useState('profile-isImageUploading').value = false;
  useState('profile-isLoadingUserImages').value = false;
  useState('profile-isLoadingData').value = false;
  useState('profile-dataLoaded').value = false;
  
  // Server-related state
  useState('server-current').value = null;
  useState('server-list').value = [];
  
  // Server permissions
  useState('server-userRole').value = null;
  useState('server-permissions').value = {};
  
  // Server layouts
  useState('server-layouts').value = {};
  useState('server-layoutsLoaded').value = false;
}; 