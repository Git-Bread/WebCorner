/**
 * LocalStorage utility functions for storing, retrieving, and managing data in localStorage
 * 
 * This file centralizes all localStorage operations for consistent patterns and error handling
 */

import { shouldLog } from '../debugUtils';

// Debug logger for storage operations
const debugStorage = (operation: string, key: string, details?: any): void => {
  if (!shouldLog('storage')) return;
  console.debug(`localStorage | ${operation} | ${key}${details ? ' | ' + JSON.stringify(details) : ''}`);
};

/**
 * Check if localStorage is available in the current environment
 * @returns True if localStorage is available
 */
export const isLocalStorageAvailable = (): boolean => {
  if (typeof window === 'undefined' || !import.meta.client) return false;
  
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    debugStorage('availability check', 'passed');
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Save data to localStorage with timestamp for expiration management
 * @param key The storage key
 * @param data The data to store
 * @param prefix Optional prefix to apply to the key
 */
export const saveToLocalStorage = (key: string, data: any, prefix?: string): void => {
  if (!isLocalStorageAvailable()) return;
  
  try {
    const fullKey = prefix ? `${prefix}_${key}` : key;
    const item = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(fullKey, JSON.stringify(item));
    debugStorage('save', fullKey, { size: JSON.stringify(item).length });
  } catch (error) {
    // Only log error, don't disrupt app flow
    if (shouldLog('storage')) console.error('Error saving to localStorage:', error);
  }
};

/**
 * Get data from localStorage with expiry check
 * @param key The storage key
 * @param maxAge Maximum age in milliseconds before data is considered stale (default: 1 hour)
 * @param prefix Optional prefix to apply to the key
 * @returns The stored data or null if expired/not found
 */
export const getFromLocalStorage = (key: string, maxAge: number = 1000 * 60 * 60, prefix?: string): any => {
  if (!isLocalStorageAvailable()) return null;
  
  try {
    const fullKey = prefix ? `${prefix}_${key}` : key;
    const item = localStorage.getItem(fullKey);
    if (!item) {
      debugStorage('get', fullKey, { found: false });
      return null;
    }
    
    const parsed = JSON.parse(item);
    const age = Date.now() - parsed.timestamp;
    
    if (age > maxAge) {
      localStorage.removeItem(fullKey); // Remove expired item
      debugStorage('get', fullKey, { expired: true, age: Math.round(age / 1000) + 's' });
      return null;
    }
    
    debugStorage('get', fullKey, { 
      found: true, 
      age: Math.round(age / 1000) + 's', 
      size: item.length 
    });
    return parsed.data;
  } catch (error) {
    if (shouldLog('storage')) console.error('Error reading from localStorage:', error);
    return null;
  }
};

/**
 * Remove item from localStorage
 * @param key The storage key to remove
 * @param prefix Optional prefix to apply to the key
 */
export const removeFromLocalStorage = (key: string, prefix?: string): void => {
  if (!isLocalStorageAvailable()) return;
  
  try {
    const fullKey = prefix ? `${prefix}_${key}` : key;
    localStorage.removeItem(fullKey);
    debugStorage('remove', fullKey);
  } catch (error) {
    if (shouldLog('storage')) console.error('Error removing from localStorage:', error);
  }
};

/**
 * Clear all items with a specific prefix
 * @param prefix The prefix to match
 */
export const clearLocalStorageByPrefix = (prefix: string): void => {
  if (!isLocalStorageAvailable()) return;
  
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    debugStorage('clear by prefix', prefix, { count: keysToRemove.length });
  } catch (error) {
    if (shouldLog('storage')) console.error('Error clearing localStorage by prefix:', error);
  }
};

/**
 * Clear all localStorage items for the application
 * @param appPrefix The application prefix used for all keys (e.g., 'webcorner')
 */
export const clearAllApplicationStorage = (appPrefix: string = 'webcorner'): void => {
  if (!isLocalStorageAvailable()) return;
  
  try {
    clearLocalStorageByPrefix(appPrefix);
    debugStorage('clear all application storage', appPrefix);
  } catch (error) {
    if (shouldLog('storage')) console.error('Error clearing all application storage:', error);
  }
};

/**
 * Migrate localStorage items to a new key format
 * @param oldKey Old storage key
 * @param newKey New storage key
 * @param transform Optional function to transform the data during migration
 * @returns True if migration was successful, false otherwise
 */
export const migrateLocalStorageItem = (oldKey: string, newKey: string, transform?: (data: any) => any): boolean => {
  if (!isLocalStorageAvailable()) return false;
  
  try {
    const item = localStorage.getItem(oldKey);
    if (!item) return false;
    
    let parsed;
    try {
      parsed = JSON.parse(item);
    } catch (e) {
      // If not JSON, store as raw string
      parsed = { data: item, timestamp: Date.now() };
    }
    
    // Apply transformation if provided
    const data = transform ? transform(parsed.data) : parsed.data;
    saveToLocalStorage(newKey, data);
    
    // Remove old item after successful migration
    localStorage.removeItem(oldKey);
    
    debugStorage('migrate', `${oldKey} → ${newKey}`);
    return true;
  } catch (error) {
    if (shouldLog('storage')) console.error('Error migrating localStorage item:', error);
    return false;
  }
};

/**
 * Check if a localStorage item exists and is not expired
 * @param key The storage key
 * @param maxAge Maximum age in milliseconds before data is considered stale (default: 1 hour)
 * @param prefix Optional prefix to apply to the key
 * @returns True if item exists and is not expired
 */
export const localStorageItemExists = (key: string, maxAge: number = 1000 * 60 * 60, prefix?: string): boolean => {
  if (!isLocalStorageAvailable()) return false;
  
  try {
    const fullKey = prefix ? `${prefix}_${key}` : key;
    const item = localStorage.getItem(fullKey);
    if (!item) {
      debugStorage('exists check', fullKey, { exists: false });
      return false;
    }
    
    const parsed = JSON.parse(item);
    const isValid = Date.now() - parsed.timestamp <= maxAge;
    
    debugStorage('exists check', fullKey, { 
      exists: true, 
      valid: isValid,
      age: Math.round((Date.now() - parsed.timestamp) / 1000) + 's'
    });
    
    return isValid;
  } catch (error) {
    if (shouldLog('storage')) console.error('Error checking localStorage item existence:', error);
    return false;
  }
};

/**
 * Get the total size of localStorage usage in bytes
 * @returns The size in bytes or null if localStorage is not available
 */
export const getLocalStorageSize = (): number | null => {
  if (!isLocalStorageAvailable()) return null;
  
  try {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        totalSize += key.length + value.length;
      }
    }
    const sizeInBytes = totalSize * 2; // Multiply by 2 because UTF-16 characters use 2 bytes per character
    
    debugStorage('get size', 'localStorage', { 
      itemCount: localStorage.length,
      sizeInBytes,
      sizeInKB: Math.round(sizeInBytes / 1024) + 'KB'
    });
    
    return sizeInBytes;
  } catch (error) {
    if (shouldLog('storage')) console.error('Error calculating localStorage size:', error);
    return null;
  }
};
