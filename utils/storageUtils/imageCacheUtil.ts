/**
 * Image Cache Utility
 * 
 * Centralized utilities for caching image URLs from Firebase Storage
 * to reduce bandwidth usage and improve performance.
 */

// Debug flag - set to true to enable debug logging
const DEBUG_IMAGE_CACHE = true;

/**
 * Debug logger for image cache operations
 * @param operation The operation being performed
 * @param url The image URL being operated on
 * @param details Additional details about the operation
 */
const debugImageCache = (operation: string, url: string, details?: any): void => {
  if (!DEBUG_IMAGE_CACHE) return;
  // Truncate long URLs to avoid cluttering the console
  const displayUrl = url && url.length > 40 ? url.substring(0, 20) + '...' + url.substring(url.length - 20) : url;
  console.debug(`imageCache | ${operation} | ${displayUrl}${details ? ' | ' + JSON.stringify(details) : ''}`);
};

// Type definitions
interface CachedImage {
  url: string;
  timestamp: number;
}

// Constants
const DEFAULT_CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

// Global in-memory cache for images
const imageCache = new Map<string, CachedImage>();

/**
 * Gets an image URL with caching
 * @param url The original image URL
 * @param maxAge Maximum age in milliseconds before cache expires (default: 30 minutes)
 * @returns The cached or original URL
 */
export const getCachedImageUrl = (url: string, maxAge: number = DEFAULT_CACHE_EXPIRY): string => {
  // Skip caching for default/static images or empty URLs
  if (!url || url.startsWith('/images/')) {
    debugImageCache('skip', url, { reason: !url ? 'empty url' : 'static image' });
    return url;
  }
  
  const now = Date.now();
  const cached = imageCache.get(url);
  
  // Return cached URL if it exists and hasn't expired
  if (cached && (now - cached.timestamp) < maxAge) {
    debugImageCache('hit', url, { 
      age: Math.round((now - cached.timestamp) / 1000) + 's',
      maxAge: Math.round(maxAge / 1000) + 's'
    });
    return cached.url;
  }
  
  // Cache the new URL
  imageCache.set(url, { url, timestamp: now });
  debugImageCache('miss', url, { cached: true });
  return url;
};

/**
 * Stores an image URL in the cache
 * @param url The image URL to cache
 * @param maxAge Maximum age in milliseconds before cache expires (default: 30 minutes)
 */
export const cacheImageUrl = (url: string, maxAge: number = DEFAULT_CACHE_EXPIRY): void => {
  if (!url || url.startsWith('/images/')) {
    debugImageCache('skip store', url, { reason: !url ? 'empty url' : 'static image' });
    return;
  }
  
  imageCache.set(url, { url, timestamp: Date.now() });
  debugImageCache('store', url);
};

/**
 * Remove an image URL from the cache
 * @param url The image URL to remove from cache
 */
export const removeCachedImage = (url: string): void => {
  if (!url) return;
  const removed = imageCache.delete(url);
  debugImageCache('remove', url, { success: removed });
};

/**
 * Clear all image URLs from the cache
 */
export const clearImageCache = (): void => {
  const count = imageCache.size;
  imageCache.clear();
  debugImageCache('clear all', '', { count });
};

/**
 * Process an array of image URLs and apply caching to each one
 * @param urls Array of image URLs to process
 * @param maxAge Maximum age in milliseconds before cache expires (default: 30 minutes)
 * @returns Array of cached image URLs
 */
export const getCachedImageUrls = (urls: string[], maxAge: number = DEFAULT_CACHE_EXPIRY): string[] => {
  const result = urls.filter(url => url !== null).map(url => getCachedImageUrl(url, maxAge));
  debugImageCache('batch', `${urls.length} URLs`, { 
    count: urls.length,
    nonNullCount: urls.filter(url => url !== null).length
  });
  return result;
};

/**
 * Profile image specific caching utilities
 */
export const profileImageCache = {
  /**
   * Cache a profile image URL
   * @param userId User ID associated with the image
   * @param url Image URL to cache
   */
  cacheProfileImage: (userId: string, url: string): void => {
    if (!userId || !url) return;
    cacheImageUrl(url);
    debugImageCache('profile store', url, { userId });
  },
  
  /**
   * Get a cached profile image URL
   * @param url Original image URL
   * @returns Cached URL or original URL
   */
  getProfileImage: (url: string): string => {
    const result = getCachedImageUrl(url);
    debugImageCache('profile get', url, { hit: result === url });
    return result;
  }
};

/**
 * Server image specific caching utilities
 */
export const serverImageCache = {
  /**
   * Cache a server image URL
   * @param serverId Server ID associated with the image
   * @param url Image URL to cache
   */
  cacheServerImage: (serverId: string, url: string): void => {
    if (!serverId || !url) return;
    cacheImageUrl(url);
    debugImageCache('server store', url, { serverId });
  },
  
  /**
   * Get a cached server image URL
   * @param url Original image URL
   * @returns Cached URL or original URL
   */
  getServerImage: (url: string): string => {
    const result = getCachedImageUrl(url);
    debugImageCache('server get', url, { hit: result === url });
    return result;
  }
};
