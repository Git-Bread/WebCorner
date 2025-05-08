/**
 * Utilities for storing and retrieving server-related data in localStorage
 */

const LAST_SELECTED_SERVER_KEY = 'webcorner_last_selected_server';

/**
 * Save the last selected server ID to localStorage
 * @param serverId - The ID of the selected server
 * @param userId - The current user ID to scope the storage to the user
 */
export const saveLastSelectedServer = (serverId: string | null, userId: string): void => {
  if (!process.client) return; // Only run on client-side
  
  try {
    if (serverId) {
      // Store the server ID with user scope
      localStorage.setItem(`${LAST_SELECTED_SERVER_KEY}_${userId}`, serverId);
    } else {
      // If null is passed, clear the saved server
      localStorage.removeItem(`${LAST_SELECTED_SERVER_KEY}_${userId}`);
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
    return localStorage.getItem(`${LAST_SELECTED_SERVER_KEY}_${userId}`);
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
  } catch (error) {
    console.warn('Failed to clear last selected server from localStorage:', error);
  }
};