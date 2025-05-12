import { ref, computed, onMounted } from 'vue';
import { collection, doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { serverSchema } from '~/schemas/serverSchemas';
import type { ServerRef } from '~/schemas/userSchemas';
import { showToast } from '~/utils/toast';
import { cleanupTempServerImages, moveServerImageToPermanent } from '~/utils/imageUtils/imageUploadUtils';
import { handleDatabaseError, handleStorageError } from '~/utils/errorHandler';
import { serverCache } from '~/utils/storageUtils/cacheUtil';
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

// Singleton instance that will be reused across the application
let serverCoreInstance: ReturnType<typeof createServerCoreComposable> | null = null;
// Track if initialization is in progress
let initializationPromise: Promise<void> | null = null;

// The actual implementation, renamed to createServerCoreComposable
function createServerCoreComposable() {
  const { firestore } = useFirebase();
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
   * Update server data state from cache
   * @param forceFresh Whether to bypass cache
   * @returns Number of servers loaded from cache
   */
  const updateFromCache = (forceFresh = false): number => {
    if (!user.value || userServers.value.length === 0) return 0;
    if (forceFresh) return 0;
    
    try {
      let loadedCount = 0;
      
      // Process each server to get its data from cache
      for (const server of userServers.value) {
        // Skip servers that you already have data for
        if (serverData.value[server.serverId]) continue;
        
        // Try to get from cache
        const cachedServerData = serverCache.getServerData(server.serverId);
        if (cachedServerData) {
          // Cache any server image URL in the image cache too
          if (cachedServerData.server_img_url) {
            serverImageCache.cacheServerImage(server.serverId, cachedServerData.server_img_url);
          }
          
          // Update our internal state
          serverData.value = {
            ...serverData.value,
            [server.serverId]: cachedServerData as ServerData
          };
          
          loadedCount++;
        }
      }
      
      if (loadedCount > 0) {
        logDebug(`Loaded data for ${loadedCount} servers from cache`);
      }
      
      return loadedCount;
    } catch (error) {
      logError('updateFromCache', error, 0);
      return 0;
    }
  };

  // PUBLIC API

  /**
   * Save server data to cache 
   * This serves as a simple wrapper around serverCache.saveServerData
   * @param serverId The ID of the server to save (or all servers if not provided)
   * @returns void
   */
  const saveServerDataToCache = (serverId?: string): void => {
    if (!user.value || Object.keys(serverData.value).length === 0) return;
    
    try {
      if (serverId && serverData.value[serverId]) {
        // Save a specific server's data
        serverCache.saveServerData(serverId, serverData.value[serverId]);
        logDebug(`Saved server data to cache: ${serverId}`);
      } else {
        // Save all servers' data
        for (const [id, data] of Object.entries(serverData.value)) {
          serverCache.saveServerData(id, data);
        }
        logDebug(`Saved ${Object.keys(serverData.value).length} servers to cache`);
      }
    } catch (error) {
      logError('saveServerDataToCache', error, null);
    }
  };

  /**
   * Save server list to cache
   * This serves as a simple wrapper around serverCache.saveServerList
   */
  const saveServerListToCache = (): void => {
    if (!user.value || userServers.value.length === 0) return;
    
    try {
      serverCache.saveServerList(user.value.uid, userServers.value);
      logDebug(`Saved server list with ${userServers.value.length} servers to cache`);
    } catch (error) {
      logError('saveServerListToCache', error, null);
    }
  };

  /**
   * Load user's servers from Firestore
   * Fetches both the server list and detailed server data
   */
  const loadUserServers = async (forceFresh = false): Promise<void> => {
    if (!user.value) return;
    
    // Skip if data is already loaded and we're not forcing a refresh
    if (isDataLoaded.value && !forceFresh) {
      return;
    }
    
    isLoading.value = true;
    
    try {
      // Try to get cached server list first if not forcing fresh data
      let cachedServerList: ServerRef[] | null = null;
      
      if (!forceFresh) {
        cachedServerList = serverCache.getServerList(user.value.uid);
        
        if (cachedServerList && cachedServerList.length > 0) {
          userServers.value = cachedServerList;
          
          // Try to load server data from cache and check if we have everything
          const cachedCount = updateFromCache();
          
          // If we have all servers' data cached, we can return early
          if (cachedCount === cachedServerList.length) {
            isLoading.value = false;
            
            // Mark data as loaded after successful loading
            isDataLoaded.value = true;
            return;
          }
        }
      }
      
      // If cache miss, force fresh, or incomplete cached data, fetch from Firestore
      const userDoc = await getDoc(doc(firestore, 'users', user.value.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const newServersList = userData.servers || [];
        
        // Check if server list has changed
        const needToUpdateList = forceFresh || 
          !cachedServerList || 
          newServersList.length !== cachedServerList.length ||
          JSON.stringify(newServersList) !== JSON.stringify(cachedServerList);
        
        if (needToUpdateList) {
          userServers.value = newServersList;
          // Update cache with new server list
          saveServerListToCache();
        }
        
        // If server list is empty, just return
        if (newServersList.length === 0) {
          isLoading.value = false;
          return;
        }
        
        // Only load server details if there are servers
        if (newServersList.length > 0) {
          // Determine which servers need to be fetched
          const serversToFetch = newServersList.filter(
            (server: ServerRef) => forceFresh || !serverData.value[server.serverId]
          );
          
          if (serversToFetch.length > 0) {
            const serverPromises = serversToFetch.map((server: ServerRef) => 
              getDoc(doc(firestore, 'servers', server.serverId))
                .then(doc => ({
                  serverId: server.serverId,
                  data: doc.exists() ? doc.data() : null
                }))
                .catch(error => {
                  logError(`loadServerDetails(${server.serverId})`, error, null);
                  return { serverId: server.serverId, data: null };
                })
            );
            
            // Wait for all server data to be fetched in parallel
            const newServersData = await Promise.all(serverPromises);
            logDebug(`Successfully fetched ${newServersData.filter(s => s.data).length} server details`);
            
            // Update server data state - preserve existing data for servers not being refreshed
            const updatedServerData = { ...serverData.value };
            let updatedCount = 0;
            
            newServersData.forEach((server: { serverId: string; data: any | null }) => {
              if (server.data) {
                // Cache any server image URL
                if (server.data.server_img_url) {
                  serverImageCache.cacheServerImage(server.serverId, server.data.server_img_url);
                }
                
                updatedServerData[server.serverId] = server.data as ServerData;
                updatedCount++;
              }
            });
            
            if (updatedCount > 0) {
              serverData.value = updatedServerData;
              
              // Update cache for each new server
              newServersData.forEach((server) => {
                if (server.data) {
                  serverCache.saveServerData(server.serverId, server.data);
                }
              });
            }
          } else {
            logDebug("No new server details needed, using cached data");
          }
        }
        
        // Mark data as loaded
        isDataLoaded.value = true;
      }
    } catch (error) {
      logError('loadUserServers', error, null);
      showToast('Failed to load your servers', 'error');
    } finally {
      isLoading.value = false;
    }
  };
  
  /**
   * Load only the user's server list without detailed server data
   * This is a lightweight version of loadUserServers for faster initial loading
   */
  const loadUserServerList = async (forceFresh = false): Promise<void> => {
    if (!user.value) return;
    
    isLoading.value = true;
    
    try {
      // Try to get cached server list first if not forcing fresh data
      if (!forceFresh) {
        const cachedServerList = serverCache.getServerList(user.value.uid);
        
        if (cachedServerList && cachedServerList.length > 0) {
          userServers.value = cachedServerList;
          isLoading.value = false;
          return;
        }
      }
      
      // If cache miss or force fresh, fetch from Firestore
      const userDoc = await getDoc(doc(firestore, 'users', user.value.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const newServersList = userData.servers || [];
        
        userServers.value = newServersList;
        
        // Update cache with new server list
        saveServerListToCache();
      }
    } catch (error) {
      logError('loadUserServerList', error, null);
      showToast('Failed to load your servers', 'error');
    } finally {
      isLoading.value = false;
    }
  };
  
  /**
   * Set the current active server
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
    
    logDebug(`Setting current server to: ${serverId}`);
    
    // Check if we already have the server data loaded
    let serverInfo = serverData.value[serverId];
    
    // If not, try to load it from cache first
    if (!serverInfo) {
      serverInfo = serverCache.getServerData(serverId) as ServerData;
      
      // If not in cache, fetch from Firestore
      if (!serverInfo && user.value) {
        logDebug(`Server data not in cache for ${serverId}, fetching from Firestore`);
        try {
          const serverDoc = await getDoc(doc(firestore, 'servers', serverId));
          if (serverDoc.exists()) {
            serverInfo = serverDoc.data() as ServerData;
            logDebug(`Successfully fetched server data for ${serverId}`);
            
            // Update the server data cache
            serverData.value = {
              ...serverData.value,
              [serverId]: serverInfo
            };
            
            // Update cache
            serverCache.saveServerData(serverId, serverInfo);
          } else {
            logDebug(`Server ${serverId} not found in Firestore`);
            return;
          }
        } catch (error) {
          logError(`setCurrentServer(${serverId})`, error, null);
          return;
        }
      } else if (serverInfo) {
        // We got it from cache, update local state
        serverData.value = {
          ...serverData.value,
          [serverId]: serverInfo
        };
        logDebug(`Loaded server data for ${serverId} from cache`);
      } else {
        logDebug(`Server ${serverId} not found in server data cache or Firestore`);
        return;
      }
    } else {
      logDebug(`Using cached server data for ${serverId} from local state`);
    }
    
    // Update the current server reference
    currentServer.value = {
      id: serverId,
      data: serverInfo
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
    const tempImageUrl = serverInfo.server_img_url;
    let serverRef;
    logDebug("Creating new server...");

    try {
      // Create server data
      const now = new Date();
      
      // Create server document reference
      serverRef = doc(collection(firestore, 'servers'));
      
      // Prepare initial server data without the image URL
      const initialServerData = {
        name: serverInfo.name,
        description: serverInfo.description || '',
        server_img_url: null, // Set to null initially
        ownerId: user.value.uid,
        createdAt: now,
        updatedAt: now,
        memberCount: 1, // Start with owner as the first member
        maxMembers: serverInfo.maxMembers || 100,
        settings: {},
        components: serverInfo.components || {
          news: true,
          groups: true,
          chat: true
        }
      };
      
      // Validate initial server data
      const validationResult = serverSchema.safeParse(initialServerData);
      
      if (!validationResult.success) {
        logError('serverValidation', validationResult.error, null);
        return 'Server information is invalid. Please check the fields.';
      }

      await setDoc(serverRef, initialServerData);
      logDebug(`Created server document with ID: ${serverRef.id}`);
      
      // --- Image Handling - AFTER initial doc creation ---
      let finalImageUrl: string | null = null;
      if (tempImageUrl && tempImageUrl.includes('temp_server_images')) {
        logDebug(`Moving temporary image to permanent location: ${tempImageUrl}`);
        try {
          const movedImageUrl = await moveServerImageToPermanent(tempImageUrl, serverRef.id);
          if (movedImageUrl) {
            finalImageUrl = movedImageUrl;
            // Update the server document with the permanent image URL
            await updateDoc(serverRef, { 
              server_img_url: finalImageUrl,
              updatedAt: new Date() // Update timestamp
            });
            logDebug(`Updated server with permanent image URL: ${finalImageUrl}`);
            
            // Clean up *all* temp images for the user after successful move and update
            await cleanupTempServerImages(user.value.uid); 
          } else {
            logDebug(`moveServerImageToPermanent returned null for server ${serverRef.id}`);
            showToast('Server created, but failed to finalize server image.', 'warning');
          }
        } catch (imageError) {
          // Use handleStorageError for user message
          const userMessage = handleStorageError(imageError);
          logError(`serverImageHandling(${serverRef.id})`, imageError, null);
          showToast(`Server created, but image setup failed: ${userMessage}`, 'warning');
          // Continue server creation even if image fails
        }
      }

      // Add reference to user's servers array
      await updateDoc(doc(firestore, 'users', user.value.uid), {
        servers: arrayUnion({
          serverId: serverRef.id,
          joinedAt: now
        })
      });
      logDebug(`Added server to user's server list`);
      
      // Create owner member record
      await setDoc(doc(firestore, 'servers', serverRef.id, 'members', user.value.uid), {
        userId: user.value.uid,
        role: 'owner',
        joinedAt: now,
        groupIds: [] 
      });
      logDebug(`Created owner member record for user: ${user.value.uid}`);
      
      showToast('Server created successfully!', 'success');
      
      // Load the latest data from Firestore
      await loadUserServers(true);
      
      return serverRef.id;
    } catch (error: any) {
      const userMessage = handleDatabaseError(error); 
      logError('createServer', error, null);
      return `Failed to create server: ${userMessage}`; 
    } finally {
      isCreatingServer.value = false;
    }
  };

  /**
   * Update server metadata like settings, components, or field configuration
   * @param serverId - The ID of the server to update
   * @param metadata - Object containing the metadata to update
   * @returns Promise<boolean> - Returns true on success, false on failure
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
        
        // Update the cache
        serverCache.saveServerData(serverId, serverData.value[serverId]);
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
   * If data is not in local state, tries cache first, then fetches from Firestore
   */
  const getServerById = async (serverId: string, forceFresh = false): Promise<ServerData | null> => {
    if (!serverId) return null;
    
    // Check local state first if not forcing fresh data
    if (!forceFresh && serverData.value[serverId]) {
      logDebug(`Using cached data for server: ${serverId} from local state`);
      return serverData.value[serverId];
    }
    
    // If not in local state or forcing fresh, but not forcing fresh from Firestore,
    // try the cache first
    if (!forceFresh) {
      const cachedData = serverCache.getServerData(serverId) as ServerData;
      if (cachedData) {
        // Update local state
        serverData.value = {
          ...serverData.value,
          [serverId]: cachedData
        };
        
        logDebug(`Found server data in cache: ${serverId}`);
        return cachedData;
      }
    }
    
    // If forcing fresh or not in cache, fetch from Firestore
    logDebug(`Fetching server data from Firestore: ${serverId}`);
    
    try {
      const serverRef = doc(firestore, 'servers', serverId);
      const serverDoc = await getDoc(serverRef);
      
      if (serverDoc.exists()) {
        const data = serverDoc.data() as ServerData;
        
        // Update local state
        serverData.value = {
          ...serverData.value,
          [serverId]: data
        };
        
        // Update cache
        serverCache.saveServerData(serverId, data);
        
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

  // Utility function to select initial server from the list
  const selectInitialServer = async (): Promise<void> => {
    if (!currentServer.value && userServers.value.length > 0 && user.value) {
      let serverIdToSelect: string | null = null;
      
      // Try to restore the last selected server first
      serverIdToSelect = serverCache.getLastSelectedServer(user.value.uid);
      
      // Make sure the server still exists in the user's server list
      if (serverIdToSelect && !userServers.value.some(s => s.serverId === serverIdToSelect)) {
        logDebug(`Last selected server ${serverIdToSelect} no longer in user's server list`);
        serverIdToSelect = null;
      } else if (serverIdToSelect) {
        logDebug(`Restoring last selected server: ${serverIdToSelect}`);
      }
      
      // If no last selected server or it wasn't found, default to the first one
      if (!serverIdToSelect) {
        serverIdToSelect = userServers.value[0].serverId;
        logDebug(`Defaulting to first server in list: ${serverIdToSelect}`);
      }
      
      // Set the selected server as current
      if (serverIdToSelect) {
        await setCurrentServer(serverIdToSelect);
      }
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
    saveServerDataToCache,
    saveServerListToCache,
    selectInitialServer
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
    // Create the instance if it doesn't exist
    if (!serverCoreInstance) {
      serverCoreInstance = createServerCoreComposable();
      
      // Create a promise for initialization
      if (!initializationPromise && serverCoreInstance) {
        const { user } = useAuth();
        if (user.value) {
          // Initialize with a proper promise to track the async operation
          initializationPromise = new Promise<void>(async (resolve) => {
            try {
              await serverCoreInstance!.loadUserServerList();
              
              // Select initial server now that the list is loaded
              await serverCoreInstance!.selectInitialServer();
            } catch (error) {
              console.error('[ServerCore] Error in initial server list load:', error);
            } finally {
              // Clear the promise to allow future initializations if needed
              initializationPromise = null;
              resolve();
            }
          });
        }
      }
    }
    
    return serverCoreInstance;
  }
};