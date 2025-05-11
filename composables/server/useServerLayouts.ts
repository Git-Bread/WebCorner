import { ref } from 'vue';
import { useFirebase } from '~/composables/useFirebase';
import { useAuth } from '~/composables/useAuth';
import { showToast } from '~/utils/toast';
import { collection, doc, getDoc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { shouldLog } from '~/utils/debugUtils';
import { setCacheItem, getCacheItem, removeCacheItem, serverCache } from '~/utils/storageUtils/cacheUtil';
import { useServerPermissions } from './useServerPermissions';

/**
 * Interface for layout field configuration
 */
export interface LayoutField {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
  defaultValue?: any;
  width?: number;
  order?: number;
  [key: string]: any; // Allow for additional properties
}

/**
 * Interface for dashboard field configuration (for type compatibility)
 */
export interface DashboardFieldConfig {
  id: string;
  title: string;
  componentType: string;
  size: { width: number; height: number };
  position: { row: number; col: number };
  props?: Record<string, any>;
  placeholder?: string;
  [key: string]: any; // Allow for additional properties
}

/**
 * Interface for layout metadata
 */
export interface LayoutMetadata {
  lastModified: Date;
  userId: string;
  isDefault?: boolean;
  name?: string;
  description?: string;
}

// Subsystem name for logging
const SUBSYSTEM = 'layouts';

// Cache key prefixes
const LAYOUT_CACHE_PREFIX = 'server_layout';
const DEFAULT_LAYOUT_PREFIX = 'default_layout';

// Cache expiration times in milliseconds
const LAYOUT_CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours for layouts

/**
 * Composable for managing user-specific server layouts
 * Stores layouts in a subcollection under each server document
 */
export function useServerLayouts() {
  const { firestore } = useFirebase();
  const { user } = useAuth();

  // State variables
  const userLayouts = ref<Record<string, LayoutField[]>>({});
  const layoutMetadata = ref<Record<string, LayoutMetadata>>({});
  const isLoadingLayout = ref(false);
  
  // PRIVATE METHODS
  
  /**
   * Logs debug information
   */
  const logDebug = (message: string, ...data: any[]): void => {
    if (shouldLog(SUBSYSTEM)) {
      console.log(`[Layouts] ${message}`, ...data);
    }
  };
  
  /**
   * Logs an error and returns a fallback value
   */
  const logError = <T>(context: string, error: unknown, fallback: T): T => {
    if (shouldLog(SUBSYSTEM)) {
      console.error(`[Layouts] ${context}:`, error);
    }
    return fallback;
  };
  
  /**
   * Generate cache key for user layout
   */
  const getUserLayoutCacheKey = (userId: string, serverId: string): string => {
    return `${LAYOUT_CACHE_PREFIX}_${userId}_${serverId}`;
  };
  
  /**
   * Generate cache key for server default layout
   */
  const getDefaultLayoutCacheKey = (serverId: string): string => {
    return `${DEFAULT_LAYOUT_PREFIX}_${serverId}`;
  };
  
  /**
   * Parse layout data from Firestore 
   */
  const parseLayoutData = (data: any): { layout: LayoutField[], metadata: LayoutMetadata } => {
    const layout = Array.isArray(data.layout) ? data.layout : [];
    
    // Extract and format metadata
    const metadata: LayoutMetadata = {
      userId: data.userId || '',
      lastModified: data.lastModified instanceof Date 
        ? data.lastModified 
        : new Date(data.lastModified || Date.now()),
      isDefault: !!data.isDefault,
      name: data.name || '',
      description: data.description || ''
    };
    
    return { layout, metadata };
  };
  
  // PUBLIC API
  
  /**
   * Clear layout cache
   */
  const clearCache = (serverId?: string, userId?: string): void => {
    userId = userId || user.value?.uid;
    if (!userId) return;
    
    if (serverId) {
      // Clear user layout cache
      const userLayoutCacheKey = getUserLayoutCacheKey(userId, serverId);
      removeCacheItem(userLayoutCacheKey, true);
      
      // Clear default layout cache
      const defaultLayoutCacheKey = getDefaultLayoutCacheKey(serverId);
      removeCacheItem(defaultLayoutCacheKey, true);
      
      logDebug(`Cleared layout cache for server: ${serverId}`);
    } else {
      logDebug('Note: Full cache clear not implemented - need to specify server ID');
    }
  };
  
  /**
   * Load a user's layout for a specific server
   * If no user-specific layout exists, it falls back to the server default
   * 
   * @param serverId The server ID to load the layout for
   * @param forceFresh If true, bypass cache and fetch from Firestore
   * @returns The layout configuration or empty array if none exists
   */
  const loadUserLayout = async <T = LayoutField>(serverId: string, forceFresh = false): Promise<T[]> => {
    if (!user.value || !serverId) return [] as T[];
    
    try {
      isLoadingLayout.value = true;
      logDebug(`Loading layout for server: ${serverId}`);
      
      // Check cache first unless force fresh is specified
      if (!forceFresh) {
        const cacheKey = getUserLayoutCacheKey(user.value.uid, serverId);
        const cachedLayout = getCacheItem<{ layout: any[], metadata: LayoutMetadata }>(cacheKey);
        
        if (cachedLayout) {
          logDebug(`Using cached layout for server: ${serverId}`);
          userLayouts.value[serverId] = cachedLayout.layout;
          layoutMetadata.value[serverId] = cachedLayout.metadata;
          return cachedLayout.layout as T[];
        }
      }
      
      // Reference to the user's layout document in the server's userLayouts subcollection
      const serverDocRef = doc(firestore, 'servers', serverId);
      const userLayoutRef = doc(collection(serverDocRef, 'userLayouts'), user.value.uid);
      
      const userLayoutDoc = await getDoc(userLayoutRef);
      
      if (userLayoutDoc.exists() && userLayoutDoc.data()?.layout) {
        // User has a custom layout for this server
        logDebug(`Found custom layout for user: ${user.value.uid}`);
        
        const { layout, metadata } = parseLayoutData(userLayoutDoc.data());
        
        // Cache the layout
        const cacheKey = getUserLayoutCacheKey(user.value.uid, serverId);
        setCacheItem(cacheKey, { layout, metadata }, LAYOUT_CACHE_EXPIRATION, true);
        
        // Update state
        userLayouts.value[serverId] = layout;
        layoutMetadata.value[serverId] = metadata;
        
        // Also use the built-in server cache for broader caching
        serverCache.saveUserLayout(user.value.uid, serverId, layout);
        
        return layout as T[];
      } else {
        // No user-specific layout, get server default layout
        logDebug(`No custom layout found, falling back to server default`);
        
        // Check cache for default layout
        if (!forceFresh) {
          const defaultCacheKey = getDefaultLayoutCacheKey(serverId);
          const cachedDefaultLayout = getCacheItem<{ layout: LayoutField[], metadata: LayoutMetadata }>(defaultCacheKey);
          
          if (cachedDefaultLayout) {
            logDebug(`Using cached default layout`);
            userLayouts.value[serverId] = cachedDefaultLayout.layout;
            layoutMetadata.value[serverId] = cachedDefaultLayout.metadata;
            return cachedDefaultLayout.layout as T[];
          }
        }
        
        // Fetch default layout from server
        const serverDoc = await getDoc(serverDocRef);
        if (serverDoc.exists() && serverDoc.data()?.fieldConfig) {
          const defaultLayout = serverDoc.data().fieldConfig;
          
          // Create default metadata
          const defaultMetadata: LayoutMetadata = {
            userId: 'system',
            lastModified: new Date(),
            isDefault: true
          };
          
          // Cache the default layout
          const defaultCacheKey = getDefaultLayoutCacheKey(serverId);
          setCacheItem(defaultCacheKey, { 
            layout: defaultLayout, 
            metadata: defaultMetadata 
          }, LAYOUT_CACHE_EXPIRATION, true);
          
          // Update state
          userLayouts.value[serverId] = defaultLayout;
          layoutMetadata.value[serverId] = defaultMetadata;
          
          return defaultLayout as T[];
        }
        
        // No server default layout either
        logDebug(`No default layout found, returning empty layout`);
        return [] as T[];
      }
    } catch (error) {
      logError(`loadUserLayout(${serverId})`, error, [] as T[]);
      showToast('Failed to load your layout', 'error');
      return [] as T[];
    } finally {
      isLoadingLayout.value = false;
    }
  };
  
  /**
   * Save a user's layout for a specific server
   * 
   * @param serverId The server ID to save the layout for
   * @param layout The layout configuration to save
   * @returns Promise resolving to true if successful, false otherwise
   */
  const saveUserLayout = async <T = LayoutField>(serverId: string, layout: T[]): Promise<boolean> => {
    if (!user.value || !serverId) return false;
    
    try {
      logDebug(`Saving layout for server: ${serverId}`);
      
      // Reference to the user's layout document in the server's userLayouts subcollection
      const serverDocRef = doc(firestore, 'servers', serverId);
      const userLayoutRef = doc(collection(serverDocRef, 'userLayouts'), user.value.uid);
      
      // Prepare layout data with metadata
      const layoutData = {
        layout,
        userId: user.value.uid,
        lastModified: new Date(),
        isDefault: false
      };
      
      // Save to Firestore
      await setDoc(userLayoutRef, layoutData);
      
      // Update local state
      userLayouts.value[serverId] = layout as unknown as LayoutField[];
      layoutMetadata.value[serverId] = {
        userId: layoutData.userId,
        lastModified: layoutData.lastModified,
        isDefault: layoutData.isDefault
      };
      
      // Update cache
      const cacheKey = getUserLayoutCacheKey(user.value.uid, serverId);
      setCacheItem(cacheKey, { 
        layout, 
        metadata: layoutMetadata.value[serverId] 
      }, LAYOUT_CACHE_EXPIRATION, true);
      
      // Also use the built-in server cache for broader caching
      serverCache.saveUserLayout(user.value.uid, serverId, layout as any[]);
      
      logDebug(`Layout saved successfully for server: ${serverId}`);
      showToast('Layout saved successfully', 'success');
      
      return true;
    } catch (error) {
      logError(`saveUserLayout(${serverId})`, error, false);
      showToast('Failed to save layout', 'error');
      return false;
    }
  };
  
  /**
   * Reset user layout to server default
   * 
   * @param serverId The server ID to reset the layout for
   * @returns True if reset was successful, false otherwise
   */
  const resetToDefaultLayout = async (serverId: string): Promise<boolean> => {
    if (!user.value || !serverId) return false;
    
    try {
      logDebug(`Resetting layout to default for server: ${serverId}`);
      
      // Reference to the user's layout document in the server's userLayouts subcollection
      const serverDocRef = doc(firestore, 'servers', serverId);
      const userLayoutRef = doc(collection(serverDocRef, 'userLayouts'), user.value.uid);
      
      // Delete the user's custom layout
      await deleteDoc(userLayoutRef);
      
      // Clear the cache
      const cacheKey = getUserLayoutCacheKey(user.value.uid, serverId);
      removeCacheItem(cacheKey, true);
      
      // Clear from the built-in server cache - pass empty array instead of null
      serverCache.saveUserLayout(user.value.uid, serverId, []);
      
      // Load the default layout
      await loadUserLayout(serverId, true);
      
      showToast('Layout reset to default', 'success');
      return true;
    } catch (error) {
      logError(`resetToDefaultLayout(${serverId})`, error, false);
      showToast('Failed to reset layout', 'error');
      return false;
    }
  };
  
  /**
   * Get the last modified date for the current layout
   * 
   * @param serverId The server ID to get the metadata for
   * @returns The last modified date or null if no layout exists
   */
  const getLayoutLastModified = (serverId: string): Date | null => {
    if (!serverId || !layoutMetadata.value[serverId]) return null;
    return layoutMetadata.value[serverId].lastModified;
  };
  
  /**
   * Check if the current layout is the server default
   * 
   * @param serverId The server ID to check
   * @returns True if current layout is the server default, false otherwise
   */
  const isUsingDefaultLayout = (serverId: string): boolean => {
    if (!serverId || !layoutMetadata.value[serverId]) return true;
    return !!layoutMetadata.value[serverId].isDefault;
  };
  
  /**
   * Set the server default layout (admin/owner only)
   * 
   * @param serverId The server ID to set the default layout for
   * @param layout The layout configuration to use as the default
   * @returns True if setting default layout was successful, false otherwise
   */
  const setServerDefaultLayout = async (serverId: string, layout: LayoutField[]): Promise<boolean> => {
    if (!user.value || !serverId) return false;
    
    try {
      logDebug(`Setting default layout for server: ${serverId}`);
      
      // Import and use the permission check
      const { hasRoleOrHigher } = useServerPermissions();
      
      // Check if user has permission to set default layout (admin or owner)
      const hasPermission = await hasRoleOrHigher(serverId, 'admin');
      if (!hasPermission) {
        logDebug(`User doesn't have permission to set default layout`);
        showToast('You need to be an admin or owner to set the default layout', 'error');
        return false;
      }
      
      // Reference to the server document
      const serverDocRef = doc(firestore, 'servers', serverId);
      
      // Save the default layout to the server document
      await setDoc(serverDocRef, {
        fieldConfig: layout,
        fieldConfigLastUpdated: new Date(),
        fieldConfigUpdatedBy: user.value.uid
      }, { merge: true });
      
      // Clear any cached default layouts
      const defaultCacheKey = getDefaultLayoutCacheKey(serverId);
      removeCacheItem(defaultCacheKey, true);
      
      // Create default metadata
      const defaultMetadata: LayoutMetadata = {
        userId: user.value.uid,
        lastModified: new Date(),
        isDefault: true
      };
      
      // Cache the new default layout
      setCacheItem(defaultCacheKey, { 
        layout, 
        metadata: defaultMetadata 
      }, LAYOUT_CACHE_EXPIRATION, true);
      
      showToast('Server default layout updated successfully', 'success');
      return true;
    } catch (error) {
      logError(`setServerDefaultLayout(${serverId})`, error, false);
      showToast('Failed to update server default layout', 'error');
      return false;
    }
  };
  
  return {
    // State
    userLayouts,
    layoutMetadata,
    isLoadingLayout,
    
    // Main operations
    loadUserLayout,
    saveUserLayout,
    resetToDefaultLayout,
    clearCache,
    setServerDefaultLayout,
    
    // Helper methods
    getLayoutLastModified,
    isUsingDefaultLayout
  };
}