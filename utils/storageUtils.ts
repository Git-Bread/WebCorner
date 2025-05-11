/**
 * Helper functions for localStorage caching
 */

/**
 * Save data to localStorage with timestamp
 * @param key The storage key
 * @param data The data to store
 */
export function saveToLocalStorage(key: string, data: any): void {
  try {
    const item = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

/**
 * Get data from localStorage with expiry check
 * @param key The storage key
 * @param maxAge Maximum age in milliseconds before data is considered stale
 * @returns The stored data or null if expired/not found
 */
export function getFromLocalStorage(key: string, maxAge: number = 1000 * 60 * 60): any {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    
    const parsed = JSON.parse(item);
    if (Date.now() - parsed.timestamp > maxAge) {
      localStorage.removeItem(key); // Remove expired item
      return null;
    }
    
    return parsed.data;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    localStorage.removeItem(key); // Remove corrupted item
    return null;
  }
}

/**
 * Remove item from localStorage
 * @param key The storage key to remove
 */
export function removeFromLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
}

/**
 * Clear all items with a specific prefix
 * @param prefix The prefix to match
 */
export function clearLocalStorageByPrefix(prefix: string): void {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing localStorage by prefix:', error);
  }
} 