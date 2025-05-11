/**
 * Utilities for storing and retrieving server-related data in localStorage
 */

const LAST_SELECTED_SERVER_KEY = 'webcorner_last_selected_server';
const SERVER_BASIC_INFO_KEY = 'webcorner_server_basic_info';

/**
 * Save the last selected server ID to localStorage
 * @param serverId - The ID of the selected server
 * @param userId - The current user ID to scope the storage to the user
 */
export const saveLastSelectedServer = (serverId: string | null, userId: string): void => {
  if (!import.meta.client) return; // Only run on client-side
  
  try {
    if (serverId) {
      localStorage.setItem(`${LAST_SELECTED_SERVER_KEY}_${userId}`, serverId);
      console.log(`Saved last selected server to localStorage: ${serverId} for user ${userId}`);
    } else {
      localStorage.removeItem(`${LAST_SELECTED_SERVER_KEY}_${userId}`);
      console.log(`Removed last selected server from localStorage for user ${userId}`);
    }
  } catch (error) {
    console.warn('Failed to save last selected server to localStorage:', error);
  }
};

/**
 * Get the last selected server ID from localStorage
 * @param userId - The current user ID to scope the storage to the user
 * @returns The server ID or null if none is stored
 */
export const getLastSelectedServer = (userId: string): string | null => {
  if (!import.meta.client) return null; // Only run on client-side
  
  try {
    const serverId = localStorage.getItem(`${LAST_SELECTED_SERVER_KEY}_${userId}`);
    console.log(`Retrieved last selected server from localStorage: ${serverId || 'none'} for user ${userId}`);
    return serverId;
  } catch (error) {
    console.warn('Failed to retrieve last selected server from localStorage:', error);
    return null;
  }
};

/**
 * Clear the last selected server from localStorage
 * @param userId - The current user ID to scope the storage to the user
 */
export const clearLastSelectedServer = (userId: string): void => {
  if (!import.meta.client) return; // Only run on client-side
  
  try {
    localStorage.removeItem(`${LAST_SELECTED_SERVER_KEY}_${userId}`);
    console.log(`Cleared last selected server from localStorage for user ${userId}`);
  } catch (error) {
    console.warn('Failed to clear last selected server from localStorage:', error);
  }
};

/**
 * Save basic server info (name and icon) to localStorage
 * @param userId - The current user ID to scope the storage to the user
 * @param serverData - Object containing server data with { [serverId]: { name, server_img_url } }
 */
export const saveServerBasicInfo = (userId: string, serverData: Record<string, any>): void => {
  if (!import.meta.client) return; // Only run on client-side
  
  try {
    // Extract only the basic info (name and image) to keep storage size minimal
    const basicInfo: Record<string, { name: string; server_img_url?: string }> = {};
    
    for (const [serverId, data] of Object.entries(serverData)) {
      if (data && data.name) {
        basicInfo[serverId] = {
          name: data.name,
          server_img_url: data.server_img_url || undefined
        };
      }
    }
    
    // Store with timestamp for cache expiration
    const storageData = {
      data: basicInfo,
      timestamp: Date.now()
    };
    
    localStorage.setItem(`${SERVER_BASIC_INFO_KEY}_${userId}`, JSON.stringify(storageData));
    console.log(`Saved basic info for ${Object.keys(basicInfo).length} servers to localStorage`);
  } catch (error) {
    console.warn('Failed to save server basic info to localStorage:', error);
  }
};

/**
 * Get basic server info from localStorage
 * @param userId - The current user ID to scope the storage to the user
 * @param maxAge - Maximum age in milliseconds before data is considered stale
 * @returns Object with server basic info or null if expired or not found
 */
export const getServerBasicInfo = (userId: string, maxAge: number = 1000 * 60 * 60 * 24): Record<string, any> | null => {
  if (!import.meta.client) return null; // Only run on client-side
  
  try {
    const item = localStorage.getItem(`${SERVER_BASIC_INFO_KEY}_${userId}`);
    if (!item) return null;
    
    const parsed = JSON.parse(item);
    
    // Check if the data is fresh
    if (Date.now() - parsed.timestamp > maxAge) {
      localStorage.removeItem(`${SERVER_BASIC_INFO_KEY}_${userId}`); // Remove expired item
      return null;
    }
    
    return parsed.data;
  } catch (error) {
    console.warn('Failed to retrieve server basic info from localStorage:', error);
    return null;
  }
};