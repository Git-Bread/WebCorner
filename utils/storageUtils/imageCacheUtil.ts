/**
 * Image Cache Utility
 * 
 * Centralized utilities for caching image URLs from Firebase Storage
 * to reduce bandwidth usage and improve performance.
 */

import { shouldLog } from '../debugUtils';

// Debug logger for image cache operations
const debugImageCache = (operation: string, url: string, details?: any): void => {
  if (!shouldLog('imageCache')) return;
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
 * Convert Firebase Storage URLs to emulator format in development
 */
const convertToEmulatorUrl = (url: string): string => {
  try {
    if (!url || !url.includes('firebasestorage.googleapis.com')) return url;
    if (process.env.NODE_ENV !== 'development') return url;
    
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/v0\/b\/(.+?)\/o\/(.+)/);
    if (!pathMatch) return url;
    
    const bucket = pathMatch[1];
    const alreadyEncodedPath = pathMatch[2]; // This path is already URL-encoded from the original URL

    // Construct emulator URL using the ALREADY ENCODED path
    return `http://127.0.0.1:9199/v0/b/${bucket}/o/${alreadyEncodedPath}${urlObj.search}`;
  } catch (error) {
    console.error("Error converting URL to emulator format:", error, "Original URL:", url);
    return url;
  }
};

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
    return convertToEmulatorUrl(cached.url);
  }
  
  // Cache the new URL
  imageCache.set(url, { url, timestamp: now });
  debugImageCache('miss', url, { cached: true });
  return convertToEmulatorUrl(url);
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
    // Check if image is already in cache before calling getCachedImageUrl
    const wasInCache = url && !url.startsWith('/images/') && imageCache.has(url);
    const result = getCachedImageUrl(url);
    debugImageCache('profile get', url, { hit: wasInCache });
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
    // Check if image is already in cache before calling getCachedImageUrl
    const wasInCache = url && !url.startsWith('/images/') && imageCache.has(url);
    const result = getCachedImageUrl(url);
    debugImageCache('server get', url, { hit: wasInCache });
    return result;
  }
};
