/**
 * Cache utility functions for in-memory caching with localStorage persistence
 * 
 * This file provides memory caching with automatic expiration and optional
 * localStorage persistence for hybrid caching strategies.
 */

import { saveToLocalStorage, getFromLocalStorage, removeFromLocalStorage, clearLocalStorageByPrefix } from './localStorageUtil';
import { shouldLog } from '../debugUtils';
import { clearImageCache } from './imageCacheUtil';

// Debug logger for cache operations
const debugCache = (operation: string, key: string, details?: any): void => {
  if (!shouldLog('cache')) return;
  console.debug(`cache | ${operation} | ${key}${details ? ' | ' + JSON.stringify(details) : ''}`);
};

// Define cache item types
export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry?: number; // Optional specific expiry time
}

// Global in-memory cache
const memoryCache = new Map<string, CacheItem<any>>();

// Application prefix for localStorage keys
const APP_PREFIX = 'webcorner_cache';

/**
 * Set a value in the memory cache with optional localStorage persistence
 * @param key Cache key
 * @param data Data to cache
 * @param maxAge Maximum age in milliseconds before item expires (default: 5 minutes)
 * @param persist Whether to also persist in localStorage (default: false)
 * @param localStorageMaxAge Override maxAge for localStorage (default: same as maxAge)
 */
export const setCacheItem = <T>(
  key: string, 
  data: T, 
  maxAge: number = 5 * 60 * 1000, 
  persist: boolean = false,
  localStorageMaxAge?: number
): void => {
  try {
    // Set in memory cache
    const timestamp = Date.now();
    memoryCache.set(key, {
      data,
      timestamp,
      expiry: timestamp + maxAge
    });
    
    // Also persist to localStorage if requested
    if (persist) {
      saveToLocalStorage(key, data, APP_PREFIX);
    }
    
    debugCache('set', key, { 
      persist, 
      maxAgeSec: Math.round(maxAge / 1000),
      expiry: new Date(timestamp + maxAge).toISOString(),
      size: typeof data === 'string' ? data.length : JSON.stringify(data).length
    });
  } catch (error) {
    if (shouldLog('cache')) console.error('Error setting cache item:', error);
  }
};

/**
 * Get a value from cache (memory first, then localStorage if not found)
 * @param key Cache key
 * @param maxAge Maximum age in milliseconds (default: 5 minutes)
 * @param refreshExpiry Whether to refresh the expiry time on access (default: false)
 * @param checkLocalStorage Whether to check localStorage if not in memory (default: true)
 * @returns Cached data or null if not found or expired
 */
export const getCacheItem = <T>(
  key: string, 
  maxAge: number = 5 * 60 * 1000,
  refreshExpiry: boolean = false,
  checkLocalStorage: boolean = true
): T | null => {
  try {
    // Check memory cache first
    const cachedItem = memoryCache.get(key);
    
    if (cachedItem) {
      const now = Date.now();
      
      // Check if item is expired
      if (cachedItem.expiry && now > cachedItem.expiry) {
        memoryCache.delete(key);
        debugCache('get', key, { source: 'memory', expired: true });
        return null;
      }
      
      // Refresh expiry if requested
      if (refreshExpiry) {
        cachedItem.expiry = now + maxAge;
        memoryCache.set(key, cachedItem);
        debugCache('get', key, { 
          source: 'memory', 
          refreshed: true, 
          newExpiry: new Date(cachedItem.expiry).toISOString() 
        });
      } else {
        debugCache('get', key, { 
          source: 'memory', 
          age: Math.round((now - cachedItem.timestamp) / 1000) + 's',
          expiry: cachedItem.expiry ? new Date(cachedItem.expiry).toISOString() : 'none'
        });
      }
      
      return cachedItem.data as T;
    }
    
    // If not in memory cache, try localStorage if enabled
    if (checkLocalStorage) {
      const localData = getFromLocalStorage(key, maxAge, APP_PREFIX);
      
      if (localData) {
        // Also cache in memory for faster access next time
        setCacheItem(key, localData, maxAge, false);
        debugCache('get', key, { source: 'localStorage', addedToMemory: true });
        return localData as T;
      }
      
      debugCache('get', key, { found: false, checked: ['memory', 'localStorage'] });
    } else {
      debugCache('get', key, { found: false, checked: ['memory'] });
    }
    
    return null;
  } catch (error) {
    if (shouldLog('cache')) console.error('Error getting cache item:', error);
    return null;
  }
};

/**
 * Remove an item from both memory cache and localStorage
 * @param key Cache key
 * @param removeFromLocal Whether to also remove from localStorage (default: true)
 */
export const removeCacheItem = (
  key: string, 
  removeFromLocal: boolean = true
): void => {
  try {
    // Remove from memory
    memoryCache.delete(key);
    
    // Also remove from localStorage if requested
    if (removeFromLocal) {
      removeFromLocalStorage(key, APP_PREFIX);
    }
    
    debugCache('remove', key, { removeFromLocal });
  } catch (error) {
    if (shouldLog('cache')) console.error('Error removing cache item:', error);
  }
};

/**
 * Check if an item exists in the cache and is not expired
 * @param key Cache key
 * @param checkLocalStorage Whether to also check localStorage (default: true)
 * @returns True if item exists and is not expired
 */
export const cacheItemExists = (
  key: string,
  checkLocalStorage: boolean = true
): boolean => {
  try {
    // Check memory cache first
    const cachedItem = memoryCache.get(key);
    
    if (cachedItem) {
      // Check if item is expired
      if (cachedItem.expiry && Date.now() > cachedItem.expiry) {
        memoryCache.delete(key);
        debugCache('exists', key, { source: 'memory', expired: true });
        return false;
      }
      debugCache('exists', key, { source: 'memory', exists: true });
      return true;
    }
    
    // If not in memory, check localStorage if enabled
    if (checkLocalStorage) {
      const localData = getFromLocalStorage(key, Infinity, APP_PREFIX);
      const exists = localData !== null;
      debugCache('exists', key, { source: 'localStorage', exists });
      return exists;
    }
    
    debugCache('exists', key, { exists: false, checked: checkLocalStorage ? ['memory', 'localStorage'] : ['memory'] });
    return false;
  } catch (error) {
    if (shouldLog('cache')) console.error('Error checking cache item existence:', error);
    return false;
  }
};

/**
 * Clear all items from memory cache
 * @param clearLocalStorage Whether to also clear matching items from localStorage (default: false)
 */
export const clearCache = (clearLocalStorage: boolean = false): void => {
  try {
    // Clear memory cache
    const itemCount = memoryCache.size;
    memoryCache.clear();
    
    debugCache('clear', 'all memory cache', { itemCount });
    
    // Also clear localStorage cache if requested
    if (clearLocalStorage) {
      // Use the properly imported function
      clearLocalStorageByPrefix(APP_PREFIX);
      debugCache('clear', 'all localStorage cache', { prefix: APP_PREFIX });
    }
    
    // Also clear the image cache
    clearImageCache();
    
  } catch (error) {
    if (shouldLog('cache')) console.error('Error clearing cache:', error);
  }
};

/**
 * Clean expired items from memory cache
 * @returns Number of items removed
 */
export const cleanExpiredCacheItems = (): number => {
  try {
    const now = Date.now();
    let removedCount = 0;
    
    // Check each item for expiry
    for (const [key, item] of memoryCache.entries()) {
      if (item.expiry && now > item.expiry) {
        memoryCache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      debugCache('clean expired', 'memory cache', { removedCount, remaining: memoryCache.size });
    }
    
    return removedCount;
  } catch (error) {
    if (shouldLog('cache')) console.error('Error cleaning expired cache items:', error);
    return 0;
  }
};

/**
 * Profile-specific cache utilities
 */
export const profileCache = {
  /**
   * Save user profile data to cache
   * @param userId User ID
   * @param data Profile data
   * @param persist Whether to also persist in localStorage (default: true)
   */
  saveProfileData: (userId: string, data: any, persist: boolean = true): void => {
    const key = `profile_${userId}`;
    setCacheItem(key, data, 24 * 60 * 60 * 1000, persist); // 24 hours cache (reduced from 30 minutes)
    debugCache('profile save', key, { userId, persist });
  },
  
  /**
   * Get user profile data from cache
   * @param userId User ID
   * @returns Profile data or null if not cached
   */
  getProfileData: (userId: string): any => {
    const key = `profile_${userId}`;
    const result = getCacheItem(key);
    debugCache('profile get', key, { userId, found: result !== null });
    return result;
  },
  
  /**
   * Invalidate user profile cache
   * @param userId User ID
   */
  invalidateProfile: (userId: string): void => {
    const key = `profile_${userId}`;
    removeCacheItem(key);
    debugCache('profile invalidate', key, { userId });
  }
};

/**
 * Server-specific cache utilities
 */
export const serverCache = {
  /**
   * Save minimal server display data for sidebar
   * @param userId User ID
   * @param serverList Server list with minimal display data
   * @param persist Whether to also persist in localStorage (default: true)
   */
  saveServerDisplayList: (userId: string, serverList: Array<{
    serverId: string;
    name: string;
    imageUrl?: string | null;
  }>, persist: boolean = true): void => {
    const key = `server_display_${userId}`;
    // Cache for 1 hour only - display data is lightweight but should be refreshed
    setCacheItem(key, serverList, 60 * 60 * 1000, persist);
    debugCache('serverCache', `saveServerDisplayList for ${userId}`, { count: serverList.length });
  },
  
  /**
   * Get minimal server display data for sidebar
   * @param userId User ID
   * @returns Minimal server display data or null if not cached
   */
  getServerDisplayList: (userId: string): Array<{
    serverId: string;
    name: string;
    imageUrl?: string | null;
  }> | null => {
    const key = `server_display_${userId}`;
    const data = getCacheItem<Array<{
      serverId: string;
      name: string;
      imageUrl?: string | null;
    }>>(key);
    debugCache('serverCache', `getServerDisplayList for ${userId}`, { found: !!data });
    return data;
  },
  
  /**
   * Save last selected server ID
   * @param serverId Server ID
   * @param userId User ID
   */
  setLastSelectedServer: (serverId: string, userId: string): void => {
    const key = `last_server_${userId}`;
    setCacheItem(key, serverId, 30 * 24 * 60 * 60 * 1000, true); // 30 days
    debugCache('serverCache', `setLastSelectedServer for ${userId}`, { serverId });
  },
  
  /**
   * Get last selected server ID
   * @param userId User ID
   * @returns Server ID or null if not cached
   */
  getLastSelectedServer: (userId: string): string | null => {
    const key = `last_server_${userId}`;
    const data = getCacheItem<string>(key);
    debugCache('serverCache', `getLastSelectedServer for ${userId}`, { serverId: data });
    return data;
  },
  
  /**
   * Remove last selected server ID from cache
   * @param userId User ID
   */
  removeLastSelectedServer: (userId: string): void => {
    const key = `last_server_${userId}`;
    removeCacheItem(key, true);
    debugCache('serverCache', `removeLastSelectedServer for ${userId}`);
  },
  
  /**
   * Invalidate all server-related caches for a user
   * @param userId User ID
   */
  invalidateAllServerData: (userId: string): void => {
    debugCache('serverCache', `invalidateAllServerData for ${userId}`);
    
    // Remove last selected server
    const lastServerKey = `last_server_${userId}`;
    removeCacheItem(lastServerKey, true);
    
    // Remove server display list 
    const serverDisplayKey = `server_display_${userId}`;
    removeCacheItem(serverDisplayKey, true);
  }
};

/**
 * Clear all user-specific caches
 * For use during login, logout, and registration to prevent stale data
 * @param previousUserId Optional previous user ID to clear (for logout scenarios)
 */
export const clearUserCaches = (previousUserId?: string): void => {
  try {
    // Clear general profile and server data
    const itemsToClear = [];
    
    // For specific user ID, clear their caches
    if (previousUserId) {
      // Profile data
      itemsToClear.push(`profile_${previousUserId}`);
      
      // Server list
      itemsToClear.push(`user_servers_${previousUserId}`);
      
      // Last selected server
      itemsToClear.push(`last_server_${previousUserId}`);
      
      // Find and clear all layout caches for this user
      for (const [key] of memoryCache.entries()) {
        if (key.startsWith(`user_layout_${previousUserId}_`)) {
          itemsToClear.push(key);
        }
      }
      
      // Clear all the identified keys
      itemsToClear.forEach(key => removeCacheItem(key));
      
      // Also clear server cache data
      serverCache.invalidateAllServerData(previousUserId);
      
      debugCache('clear user caches', `for user ${previousUserId}`, { 
        itemsCleared: itemsToClear.length
      });
    } else {
      // Clear all user-related caches when no specific user is provided
      // This is more aggressive but ensures all user data is reset
      const keysToRemove = [];
      
      for (const [key] of memoryCache.entries()) {
        if (
          key.startsWith('profile_') || 
          key.startsWith('user_servers_') ||
          key.startsWith('user_layout_') ||
          key.startsWith('last_server_') ||
          key.startsWith('server_data_')
        ) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => removeCacheItem(key));
      
      debugCache('clear all user caches', 'no specific user', { 
        itemsCleared: keysToRemove.length
      });
    }
    
    // Also clear the image cache
    clearImageCache();
    
  } catch (error) {
    if (shouldLog('cache')) console.error('Error clearing user caches:', error);
  }
};
