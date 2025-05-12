import { ref } from 'vue';
import { useFirebase } from '~/composables/useFirebase';
import { useAuth } from '~/composables/useAuth';
import { showToast } from '~/utils/toast';
import { collection, doc, getDoc, setDoc, deleteDoc, getDocs, updateDoc } from 'firebase/firestore';
import { shouldLog } from '~/utils/debugUtils';


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

// Additional debug categories for more granular logging
const DEBUG_CACHE = 'layouts-cache';
const DEBUG_DATA = 'layouts-data';

/**
 * Logs debug information
 */
const logDebug = (message: string, ...data: any[]): void => {
  if (shouldLog(SUBSYSTEM)) {
    console.log(`[Layouts] ${message}`, ...data);
  }
};

/**
 * Logs debug information for cache operations specifically
 */
const logCacheDebug = (message: string, ...data: any[]): void => {
  if (shouldLog(DEBUG_CACHE)) {
    console.log(`[Layouts Cache] ${message}`, ...data);
  }
};

/**
 * Logs debug information for layout data specifically
 */
const logDataDebug = (message: string, ...data: any[]): void => {
  if (shouldLog(DEBUG_DATA)) {
    console.log(`[Layouts Data] ${message}`, ...data);
  }
};

/**
 * Helper function to handle database errors
 */
const handleDatabaseError = (error: any, operation: string, userMessage?: string) => {
  console.error(`[Layouts] Error in ${operation}:`, error);
  
  if (userMessage) {
    showToast(userMessage, 'error');
  }
  
  return null;
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

/**
 * Get a layout from the database for a specific server and user
 */
export const useServerLayouts = () => {
  // Initialize dependencies
  const { firestore } = useFirebase();
  const { user } = useAuth();
  
  // State
  const isLoadingLayout = ref(false);
  const isError = ref(false);
  
  /**
   * Clear any cached layouts for a specific server
   * @param serverId - ID of the server to clear cache for
   */
  const clearCache = (serverId: string) => {
    if (!user.value?.uid) return;
    
    // We no longer cache layouts - layout data is always fresh from the database
    logCacheDebug(`No layout cache to clear - not using caching for layouts`);
  };
  
  /**
   * Load the user's custom layout for a server
   * @param serverId - ID of the server to load layout for
   * @param forceFresh - Whether to bypass cache and fetch fresh layout
   * @returns Array of layout field configurations or null if none found
   */
  const loadUserLayout = async <T = any[]>(serverId: string, forceFresh = false): Promise<T | null> => {
    if (!user.value || !serverId) return null;
    
    isLoadingLayout.value = true;
    
    try {
      logDebug(`Loading layout for server: ${serverId} and user: ${user.value.uid}`);
      
      // First try to load the user-specific layout
      const userLayoutRef = doc(firestore, 'servers', serverId, 'userLayouts', user.value.uid);
      const userLayoutSnapshot = await getDoc(userLayoutRef);
      
      // If user has a custom layout, return it
      if (userLayoutSnapshot.exists() && userLayoutSnapshot.data().layout) {
        logDataDebug(`Loaded user-specific layout for ${serverId}`);
        return userLayoutSnapshot.data().layout as T;
      }
      
      // Fall back to the global server layout if no user-specific layout exists
      const serverDocRef = doc(firestore, 'servers', serverId);
      const serverSnapshot = await getDoc(serverDocRef);
      
      if (serverSnapshot.exists()) {
        const serverData = serverSnapshot.data();
        // Check if layout exists in the server data
        if (serverData.layout) {
          logDataDebug(`Falling back to global layout from server document for ${serverId}`);
          return serverData.layout as T;
        } else {
          logDebug(`No layout found for server ${serverId}`);
          return null;
        }
      } else {
        logDebug(`Server document not found: ${serverId}`);
        return null;
      }
    } catch (error) {
      isError.value = true;
      handleDatabaseError(error, 'load layout', `Failed to load layout for server ${serverId}`);
      return null;
    } finally {
      isLoadingLayout.value = false;
    }
  };
  
  /**
   * Save a user's custom layout for a server
   * @param serverId - ID of the server to save layout for
   * @param layoutData - The layout configuration to save
   * @returns Whether the save was successful
   */
  const saveUserLayout = async <T = any[]>(serverId: string, layoutData: T): Promise<boolean> => {
    if (!user.value || !serverId) return false;
    
    try {
      logDebug(`Saving layout for server: ${serverId} and user: ${user.value.uid}`);
      
      // Save to the user-specific layout document
      const userLayoutRef = doc(firestore, 'servers', serverId, 'userLayouts', user.value.uid);
      
      // Set the document with layout data and metadata
      await setDoc(userLayoutRef, {
        layout: layoutData,
        updatedAt: new Date(),
        userId: user.value.uid
      });
      
      logDataDebug(`Saved user-specific layout for server ${serverId}`);
      return true;
    } catch (error) {
      isError.value = true;
      handleDatabaseError(error, 'save layout', `Failed to save layout for server ${serverId}`);
      return false;
    }
  };
  
  return {
    isLoadingLayout,
    isError,
    loadUserLayout,
    saveUserLayout,
    clearCache
  };
};