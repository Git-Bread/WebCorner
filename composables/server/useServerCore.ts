import { ref, computed } from 'vue';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { ServerRef } from '~/schemas/userSchemas';
import { showToast } from '~/utils/toast';
import { handleDatabaseError } from '~/utils/errorHandler';
import { serverCache, setCacheItem, getCacheItem, removeCacheItem } from '~/utils/storageUtils/cacheUtil';
import { serverImageCache } from '~/utils/storageUtils/imageCacheUtil';
import { shouldLog } from '~/utils/debugUtils';

/**
 * Interface for server data
 */
export interface ServerData {
  id: string;
  name: string;
  description: string;
  server_img_url: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
  maxMembers: number;
  settings: Record<string, any>;
  components: Record<string, boolean>;
  [key: string]: any; // Allow for additional properties
}

/**
 * Interface for server creation parameters
 */
export interface ServerCreateParams {
  name: string;
  description: string;
  server_img_url?: string | null;
  maxMembers?: number;
  components?: Record<string, boolean>;
}

/**
 * Interface for current server state
 */
export interface CurrentServerState {
  id: string;
  data?: ServerData;
}

// Subsystem name for logging
const SUBSYSTEM = 'server-core';

// Additional debug categories for more granular logging
const DEBUG_CACHE = 'server-cache';
const DEBUG_DATA = 'server-data';
const DEBUG_SERVER = 'server-selection';

// Singleton instance that will be reused across the application
let serverCoreInstance: ReturnType<typeof createServerCoreComposable> | null = null;
// Track if initialization is in progress
let initializationPromise: Promise<void> | null = null;

// Cache keys
const getUserDocCacheKey = (userId: string) => `user_doc_${userId}`;
const USER_DOC_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// The actual implementation, renamed to createServerCoreComposable
function createServerCoreComposable() {
  const { firestore, functions } = useFirebase();
  const { user } = useAuth();
  
  // State
  const userServers = ref<ServerRef[]>([]);
  const serverData = ref<Record<string, ServerData>>({});
  const isLoading = ref(false);
  const isCreatingServer = ref(false);
  const isDataLoaded = ref(false);
  
  // Current server state
  const currentServer = ref<CurrentServerState | null>(null);
  
  // PRIVATE METHODS
  
  /**
   * Logs debug information
   */
  const logDebug = (message: string, ...data: any[]): void => {
    if (shouldLog(SUBSYSTEM)) {
      console.log(`[ServerCore] ${message}`, ...data);
    }
  };
  
  /**
   * Logs an error and returns a fallback value
   */
  const logError = <T>(context: string, error: unknown, fallback: T): T => {
    if (shouldLog(SUBSYSTEM)) {
      console.error(`[ServerCore] ${context}:`, error);
    }
    return fallback;
  };
  
  // Computed property to get current server ID
  const currentServerId = computed((): string | null => {
    // The only source is the explicitly set current server
    return currentServer.value?.id || null;
  });

  /**
   * Convert a server to minimal display data format
   * @param serverId The server ID
   * @param data The full server data
   */
  const createServerDisplayData = (serverId: string, data: ServerData | null) => {
    if (!data) return { serverId, name: 'Unknown Server' };
    return {
      serverId,
      name: data.name || 'Unnamed Server',
      imageUrl: data.server_img_url || null
    };
  };

  /**
   * Save server display data to cache
   * This serves as a minimal caching mechanism for server sidebar display
   * @returns void
   */
  const saveServerDisplayDataToCache = (): void => {
    if (!user.value || Object.keys(serverData.value).length === 0) return;
    
    try {
      // Create minimal display data array from all loaded servers
      const displayData = Object.entries(serverData.value).map(
        ([serverId, data]) => createServerDisplayData(serverId, data)
      );
      
      // Save to cache
      serverCache.saveServerDisplayList(user.value.uid, displayData);
      logDebug(`Saved minimal display data for ${displayData.length} servers to cache`);
    } catch (error) {
      logError('saveServerDisplayDataToCache', error, null);
    }
  };

  // PUBLIC API

  /**
   * Load user's servers from Firestore
   * Fetches both the server list and detailed server data
   * @param forceFresh Whether to force fresh data
   */
  const loadUserServers = async (forceFresh = false): Promise<void> => {
    if (!user.value) return;
    
    isLoading.value = true;
    
    try {
      // Try to get user document from cache first if not forcing fresh data
      let userData: { servers?: ServerRef[] } = {};
      let shouldFetchFromFirestore = forceFresh;
      
      if (!forceFresh) {
        const cacheKey = getUserDocCacheKey(user.value.uid);
        const cachedUserDoc = getCacheItem(cacheKey);
        
        if (cachedUserDoc) {
          logDebug(`Using cached user document for ${user.value.uid}`);
          userData = cachedUserDoc;
          
          // Check if the cached user document actually has server data
          // If not, we should still fetch from Firestore
          if (!userData.servers || userData.servers.length === 0) {
            logDebug(`Cached user document doesn't have server data, fetching from Firestore`);
            shouldFetchFromFirestore = true;
          }
        } else {
          shouldFetchFromFirestore = true;
        }
      }
      
      // If force fresh, cache miss, or empty cached server list, fetch from Firestore
      if (shouldFetchFromFirestore) {
        const userDoc = await getDoc(doc(firestore, 'users', user.value.uid));
        
        if (userDoc.exists()) {
          userData = userDoc.data() as { servers?: ServerRef[] };
          
          // Cache the user document
          const cacheKey = getUserDocCacheKey(user.value.uid);
          setCacheItem(cacheKey, userData, USER_DOC_CACHE_EXPIRY, true);
          logDebug(`Cached user document for ${user.value.uid}`);
        } else {
          isLoading.value = false;
          return;
        }
      }
      
      // Process the user data
      const newServersList = userData.servers || [];
      userServers.value = newServersList;
      
      // If server list is empty, just return
      if (newServersList.length === 0) {
        isLoading.value = false;
        isDataLoaded.value = true;
        return;
      }
      
      // Only load server details if there are servers
      if (newServersList.length > 0) {
        // Fetch all server data
        const serverPromises = newServersList.map((server: ServerRef) => 
          getDoc(doc(firestore, 'servers', server.serverId))
            .then(doc => {
              return {
                serverId: server.serverId,
                data: doc.exists() ? doc.data() : null
              };
            })
            .catch(error => {
              logError(`loadServerDetails(${server.serverId})`, error, null);
              return { serverId: server.serverId, data: null };
            })
        );
        
        // Wait for all server data to be fetched in parallel
        const newServersData = await Promise.all(serverPromises);
        logDebug(`Successfully fetched ${newServersData.filter(s => s.data).length} server details`);
        
        // Update server data state
        const updatedServerData = { ...serverData.value };
        
        newServersData.forEach((server: { serverId: string; data: any | null }) => {
          if (server.data) {
            // Cache any server image URL in the image cache
            if (server.data.server_img_url) {
              serverImageCache.cacheServerImage(server.serverId, server.data.server_img_url);
            }
            
            updatedServerData[server.serverId] = server.data as ServerData;
          }
        });
        
        serverData.value = updatedServerData;
        
        // Save minimal display data to cache after loading
        saveServerDisplayDataToCache();
      }
      
      // Mark data as loaded
      isDataLoaded.value = true;
    } catch (error) {
      logError('loadUserServers', error, null);
      showToast('Failed to load your servers', 'error');
    } finally {
      isLoading.value = false;
    }
  };
  
  /**
   * Load only the user's server list with minimal display data
   * This is a lightweight version of loadUserServers for faster initial loading
   * @param forceFresh Whether to force fresh data
   */
  const loadUserServerList = async (forceFresh = false): Promise<void> => {
    if (!user.value) return;
    
    isLoading.value = true;
    
    try {
      // Try to get cached server display list first if not forcing fresh data
      if (!forceFresh) {
        const cachedDisplayList = serverCache.getServerDisplayList(user.value.uid);
        
        if (cachedDisplayList && cachedDisplayList.length > 0) {
          // We have cached display data for the servers
          logDebug(`Using ${cachedDisplayList.length} servers from display cache`);
          
          // Convert to ServerRef format for userServers
          const serverRefs = cachedDisplayList.map(server => ({
            serverId: server.serverId,
            addedAt: new Date() // We don't store this in display cache
          }));
          
          userServers.value = serverRefs;
          
          // Pre-fill serverData with minimal info for the sidebar
          cachedDisplayList.forEach(server => {
            if (!serverData.value[server.serverId]) {
              // Create a minimal ServerData object just for display
              serverData.value[server.serverId] = {
                id: server.serverId,
                name: server.name,
                server_img_url: server.imageUrl || null,
                description: '',
                ownerId: '',
                createdAt: new Date(),
                updatedAt: new Date(),
                memberCount: 0,
                maxMembers: 100,
                settings: {},
                components: {}
              };
            }
            
            // Also ensure image is cached
            if (server.imageUrl) {
              serverImageCache.cacheServerImage(server.serverId, server.imageUrl);
            }
          });
          
          isDataLoaded.value = true;
          isLoading.value = false;
          return;
        }
        
        // Try to get user document from cache before we call the full loadUserServers
        const cacheKey = getUserDocCacheKey(user.value.uid);
        const cachedUserDoc = getCacheItem<{ servers?: ServerRef[] }>(cacheKey);
        
        if (cachedUserDoc && cachedUserDoc.servers) {
          logDebug(`Using cached user document for ${user.value.uid} in loadUserServerList`);
          
          // Process the user data for just the server list
          const newServersList = cachedUserDoc.servers || [];
          userServers.value = newServersList;
          
          // Mark data as loaded - we'll load full server data later if needed
          isDataLoaded.value = true;
          isLoading.value = false;
          
          // Save display data to cache for future use
          saveServerDisplayDataToCache();
          return;
        }
      }
      
      // If all cache attempts failed or force fresh, fetch full data from Firestore
      await loadUserServers(forceFresh);
    } catch (error) {
      logError('loadUserServerList', error, null);
      showToast('Failed to load your servers', 'error');
    } finally {
      isLoading.value = false;
    }
  };
  
  /**
   * Set the current active server using already loaded data
   * @param serverId - ID of the server to set as current
   */  
  const setCurrentServer = async (serverId: string | null): Promise<void> => {
    if (!serverId) {
      currentServer.value = null;
      logDebug("Cleared current server");
      return;
    }
    
    // Check if current server is already set to this server
    if (currentServer.value?.id === serverId) {
      logDebug(`Server ${serverId} is already the current server`);
      return; // Skip if already set to avoid unnecessary operations
    }
    
    // Check if the server data is already loaded
    const existingServerData = serverData.value[serverId];
    if (!existingServerData) {
      logDebug(`Cannot set server ${serverId} as current: no data loaded`);
      return;
    }
    
    logDebug(`Setting current server to: ${serverId}`);
    
    // Update the current server reference
    currentServer.value = {
      id: serverId,
      data: existingServerData
    };
    
    // Save last selected server to cache
    if (user.value) {
      serverCache.setLastSelectedServer(serverId, user.value.uid);
      logDebug(`Saved last selected server to cache: ${serverId}`);
    }
    
    logDebug(`Current server successfully set to ${serverId}`);
  };
  
  /**
   * Create a new server
   * @returns Promise<string | null> - Returns server ID on success, or an error message on failure.
   */
  const createServer = async (serverInfo: ServerCreateParams): Promise<string | null> => {
    if (!user.value) {
      return "User not authenticated.";
    }

    // Check if the user has reached the maximum server limit (3)
    if (userServers.value.length >= 3) {
      showToast('You have reached the maximum limit of 3 servers', 'error');
      return "Maximum server limit reached. You can only create up to 3 servers.";
    }

    isCreatingServer.value = true;
    logDebug("Creating new server...");

    try {
      // Use the Cloud Function to create the server
      const createServerFunction = httpsCallable(functions, 'createServer');
      
      const result = await createServerFunction({
        name: serverInfo.name,
        description: serverInfo.description || '',
        server_img_url: serverInfo.server_img_url || null,
        maxMembers: serverInfo.maxMembers || 100,
        components: serverInfo.components || {
          news: true,
          groups: true,
          chat: true
        }
      });
      
      const response = result.data as any;
      
      if (response.success && response.serverId) {
        logDebug(`Server created successfully with ID: ${response.serverId}`);
        
        // If the server creation returned server data, update local state
        if (response.serverData) {
          serverData.value = {
            ...serverData.value,
            [response.serverId]: response.serverData
          };
          
          // Cache the server image
          if (response.serverData.server_img_url) {
            serverImageCache.cacheServerImage(response.serverId, response.serverData.server_img_url);
          }
          
          // Update the display cache
          saveServerDisplayDataToCache();
        }
        
        // Load the latest data from Firestore to ensure everything is in sync
        await loadUserServers(true);
        
        showToast('Server created successfully!', 'success');
        return response.serverId;
      } else {
        const errorMessage = response.message || 'Failed to create server';
        logDebug(`Server creation failed: ${errorMessage}`);
        showToast(errorMessage, 'error');
        return `Failed to create server: ${errorMessage}`;
      }
    } catch (error: any) {
      let errorMessage = 'Unknown error occurred';
      
      // Extract error message from Firebase callable response
      if (error.code === 'functions/invalid-argument') {
        errorMessage = error.message || 'Invalid server information';
      } else if (error.code === 'functions/resource-exhausted') {
        errorMessage = 'Maximum server limit reached';
      } else if (error.code === 'functions/permission-denied') {
        errorMessage = 'You do not have permission to create a server';
      } else if (error.details) {
        errorMessage = error.details.message || 'Server creation failed';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      logError('createServer', error, null);
      showToast(errorMessage, 'error');
      return `Failed to create server: ${errorMessage}`;
    } finally {
      isCreatingServer.value = false;
    }
  };

  /**
   * Update server metadata
   * @param serverId The server ID to update
   * @param metadata The metadata to update
   * @returns Whether the update was successful
   */
  const updateServerMetadata = async (
    serverId: string,
    metadata: Record<string, any>
  ): Promise<boolean> => {
    if (!user.value || !serverId) return false;
    
    logDebug(`Updating metadata for server: ${serverId}`);
    
    try {
      // Check if the server exists
      const serverRef = doc(firestore, 'servers', serverId);
      const serverDoc = await getDoc(serverRef);
      
      if (!serverDoc.exists()) {
        showToast('Server not found', 'error');
        return false;
      }
      
      // Update the metadata with the current timestamp
      const updateData = {
        ...metadata,
        updatedAt: new Date()
      };
      
      await updateDoc(serverRef, updateData);
      
      // Update the local state to reflect changes
      if (serverData.value[serverId]) {
        serverData.value[serverId] = {
          ...serverData.value[serverId],
          ...updateData
        };
        
        // If current server is being updated, update the currentServer ref too
        if (currentServer.value?.id === serverId) {
          currentServer.value.data = {
            ...currentServer.value.data,
            ...updateData
          } as ServerData;
        }
        
        // Update the display data cache
        saveServerDisplayDataToCache();
      }
      
      logDebug(`Successfully updated server metadata for: ${serverId}`);
      return true;
    } catch (error) {
      logError(`updateServerMetadata(${serverId})`, error, false);
      const userMessage = handleDatabaseError(error);
      showToast(`Failed to update server: ${userMessage}`, 'error');
      return false;
    }
  };
  
  /**
   * Get a specific server's data by ID
   * If data is not in local state, fetch from Firestore
   */
  const getServerById = async (serverId: string, forceFresh = false): Promise<ServerData | null> => {
    if (!serverId) return null;
    
    // Check local state first if not forcing fresh data
    if (!forceFresh && serverData.value[serverId]) {
      logDebug(`Using cached data for server: ${serverId} from local state`);
      
      // Debug server data structure
      if (shouldLog(DEBUG_DATA)) {
        console.log(`[ServerCore Data] LOCAL STATE DATA for ${serverId}:`, JSON.stringify({
          id: serverId,
          name: serverData.value[serverId]?.name,
          description: serverData.value[serverId]?.description,
          hasComponents: !!serverData.value[serverId]?.components,
          componentsCount: serverData.value[serverId]?.components ? Object.keys(serverData.value[serverId].components).length : 0,
          memberCount: serverData.value[serverId]?.memberCount,
          hasImage: !!serverData.value[serverId]?.server_img_url,
          imageUrl: serverData.value[serverId]?.server_img_url
        }, null, 2));
      }
      
      return serverData.value[serverId];
    }
    
    // If not in local state or forcing fresh, fetch from Firestore
    logDebug(`Fetching server data from Firestore: ${serverId}`);
    
    try {
      const serverRef = doc(firestore, 'servers', serverId);
      const serverDoc = await getDoc(serverRef);
      
      if (serverDoc.exists()) {
        const data = serverDoc.data() as ServerData;
        
        // Debug Firestore server data
        if (shouldLog(DEBUG_DATA)) {
          console.log(`[ServerCore Data] FIRESTORE DATA for ${serverId}:`, JSON.stringify({
            id: serverId,
            name: data?.name,
            description: data?.description,
            hasComponents: !!data?.components,
            componentsCount: data?.components ? Object.keys(data.components).length : 0,
            memberCount: data?.memberCount,
            hasImage: !!data?.server_img_url,
            imageUrl: data?.server_img_url,
            rawData: data
          }, null, 2));
        }
        
        // Update local state
        serverData.value = {
          ...serverData.value,
          [serverId]: data
        };
        
        // Update image cache if needed
        if (data.server_img_url) {
          serverImageCache.cacheServerImage(serverId, data.server_img_url);
        }
        
        // Update display data cache
        saveServerDisplayDataToCache();
        
        return data;
      }
      
      logDebug(`Server not found: ${serverId}`);
      return null;
    } catch (error) {
      logError(`getServerById(${serverId})`, error, null);
      return null;
    }
  };

  /**
   * Clear server caches - useful for logout or when troubleshooting
   */
  const clearServerCaches = (userId?: string): void => {
    userId = userId || user.value?.uid;
    if (!userId) return;
    
    try {
      // Reset state
      userServers.value = [];
      serverData.value = {};
      currentServer.value = null;
      
      // Clear all server-related caches
      serverCache.invalidateAllServerData(userId);
      
      // Clear user document cache
      const cacheKey = getUserDocCacheKey(userId);
      removeCacheItem(cacheKey, true);
      
      logDebug(`Cleared all server caches for user: ${userId}`);
    } catch (error) {
      logError('clearServerCaches', error, null);
    }
  };

  /**
   * Clear the current server selection
   * Removes the current server from state and cache
   */
  const clearCurrentServer = async (): Promise<void> => {
    if (!user.value) return;
    
    try {
      // Reset current server state
      currentServer.value = null;
      
      // Remove from cache
      serverCache.removeLastSelectedServer(user.value.uid);
      
      logDebug('Cleared current server selection');
    } catch (error) {
      logError('clearCurrentServer', error, null);
    }
  };

  return {
    // State
    userServers,
    serverData,
    isLoading,
    isCreatingServer,
    isDataLoaded,
    currentServer,
    
    // Computed
    currentServerId,
    
    // Methods
    loadUserServers,
    loadUserServerList,
    setCurrentServer,
    createServer,
    updateServerMetadata,
    getServerById,
    clearServerCaches,
    clearCurrentServer,
    saveServerDisplayDataToCache
  };
}

/**
 * The public-facing function that ensures only one instance is used
 */
export const useServerCore = () => {
  // If an instance is already created, return it immediately
  if (serverCoreInstance) {
    return serverCoreInstance;
  }
  
  // If initialization is in progress, wait for it to complete
  if (initializationPromise) {
    return createServerInstance();
  }
  
  return createServerInstance();
  
  // Helper function to create and initialize the server instance
  function createServerInstance() {
    if (!serverCoreInstance) {
      serverCoreInstance = createServerCoreComposable();
    }
    return serverCoreInstance;
  }
};