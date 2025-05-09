import { ref, computed, watch, onMounted } from 'vue';
import { collection, doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { serverSchema } from '~/schemas/serverSchemas';
import type { ServerRef } from '~/schemas/userSchemas';
import { showToast } from '~/utils/toast';
import { cleanupTempServerImages, moveServerImageToPermanent } from '~/utils/imageUtils/imageUploadUtils';
import { handleDatabaseError, handleStorageError } from '~/utils/errorHandler';

/**
 * Composable for core server operations like loading server data and creating new servers
 */
export const useServerCore = () => {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const route = useRoute();
  
  // State
  const userServers = ref<ServerRef[]>([]);
  const serverData = ref<Record<string, any>>({});
  const isLoading = ref(false);
  const isCreatingServer = ref(false);
  
  // Current server state with auto-detection from route
  const currentServer = ref<{ id: string; data?: Record<string, any> } | null>(null);
  
  // Computed property to get current server ID from route or stored value
  const currentServerId = computed(() => {
    // First check if we have a server ID in the route
    if (route.params.serverId) {
      return route.params.serverId as string;
    }
    
    // Then check if we have a stored current server
    if (currentServer.value?.id) {
      return currentServer.value.id;
    }
    
    // If user has servers, default to the first one
    if (userServers.value.length > 0) {
      return userServers.value[0].serverId;
    }
    
    return null;
  });
    /**
   * Load user's servers from Firestore
   */  const loadUserServers = async (): Promise<void> => {
    if (!user.value) return;
    
    isLoading.value = true;
    console.log("Loading user servers...");
    
    try {
      const userDoc = await getDoc(doc(firestore, 'users', user.value.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const newServersList = userData.servers || [];
        
        console.log(`Found ${newServersList.length} servers for user`);
        
        // Only process changes if the server list has actually changed
        const serverIdsChanged = 
          newServersList.length !== userServers.value.length ||
          !newServersList.every((newServer: ServerRef) => 
            userServers.value.some(existing => existing.serverId === newServer.serverId)
          );
        
        if (serverIdsChanged) {
          console.log("Server list has changed, updating...");
          userServers.value = newServersList;
          
          // Only load server details if there are servers and the list has changed
          if (newServersList.length > 0) {
            // Only fetch servers we don't already have data for
            const serversToFetch = newServersList.filter(
              (server: ServerRef) => !serverData.value[server.serverId]
            );
            
            console.log(`Need to fetch ${serversToFetch.length} new server details`);
            
            if (serversToFetch.length > 0) {
              const serverPromises = serversToFetch.map((server: ServerRef) => 
                getDoc(doc(firestore, 'servers', server.serverId))
                  .then(doc => ({
                    serverId: server.serverId,
                    data: doc.exists() ? doc.data() : null
                  }))
                  .catch(error => {
                    console.error(`Error loading server ${server.serverId}:`, error);
                    return { serverId: server.serverId, data: null };
                  })
              );
              
              // Wait for all new server data to be fetched in parallel
              const newServersData = await Promise.all(serverPromises);
              console.log(`Successfully fetched ${newServersData.filter(s => s.data).length} server details`);
              
              // Update server data state - preserve existing data
              const updatedServerData = { ...serverData.value };
              newServersData.forEach((server: { serverId: string; data: any | null }) => {
                if (server.data) {
                  updatedServerData[server.serverId] = server.data;
                }
              });
              
              serverData.value = updatedServerData;
            } else {
              console.log("All server data already in cache, no need to fetch");
            }
            
            // After loading servers, try to set the current server if needed
            if (!currentServer.value && currentServerId.value) {
              console.log(`Setting current server to ${currentServerId.value} after loading servers`);
              await setCurrentServer(currentServerId.value);
            }
          }
        } else {
          console.log("Server list unchanged, using cached data");
        }
      }
    } catch (error) {
      console.error('Error loading user servers:', error);
      showToast('Failed to load your servers', 'error');
    } finally {
      isLoading.value = false;
    }
  };
  /**
   * Set the current active server
   * @param serverId - ID of the server to set as current
   */  const setCurrentServer = async (serverId: string | null): Promise<void> => {
    if (!serverId) {
      currentServer.value = null;
      console.log("Cleared current server");
      return;
    }
    
    // Check if current server is already set to this server
    if (currentServer.value?.id === serverId) {
      console.log(`Server ${serverId} is already the current server, skipping redundant update`);
      return; // Skip if already set to avoid unnecessary operations
    }
    
    console.log(`Setting current server to: ${serverId}`);
    
    // Check if we already have the server data loaded
    let serverInfo = serverData.value[serverId];
    
    // If not, try to load it from Firestore
    if (!serverInfo && user.value) {
      console.log(`Server data not in cache for ${serverId}, fetching from Firestore`);
      try {
        const serverDoc = await getDoc(doc(firestore, 'servers', serverId));
        if (serverDoc.exists()) {
          serverInfo = serverDoc.data();
          console.log(`Successfully fetched server data for ${serverId}`);
          // Update the server data cache
          serverData.value = {
            ...serverData.value,
            [serverId]: serverInfo
          };
        } else {
          console.warn(`Server ${serverId} not found in Firestore`);
          return;
        }
      } catch (error) {        console.error(`Error loading server ${serverId}:`, error);
        return;
      }
    } else if (!serverInfo) {
      console.warn(`Server ${serverId} not found in server data cache`);
      return;
    } else {
      console.log(`Using cached server data for ${serverId}`);
    }
    
    // Update the current server reference
    currentServer.value = {
      id: serverId,
      data: serverInfo
    };
    
    console.log(`Current server successfully set to ${serverId}`);
    
    // Skip router navigation - we're handling the UI updates directly
  };
  
  /**
   * Create a new server
   * @returns Promise<string | null> - Returns null on success, or an error message string on failure.
   */
  const createServer = async (serverInfo: { 
    name: string; 
    description: string;
    server_img_url?: string | null; 
    maxMembers?: number;
    components?: Record<string, boolean>;
  }): Promise<string | null> => {
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

    try {
      // Create server data
      const now = new Date();
      
      // Create server document reference
      serverRef = doc(collection(firestore, 'servers'));
      
      // Prepare initial server data *without* the image URL since it needs owner id to be handled
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
      const validationResult = serverSchema.safeParse({
        ...initialServerData
      });
      
      if (!validationResult.success) {
        console.error('Initial server data validation failed:', validationResult.error.flatten());
        return 'Server information is invalid. Please check the fields.';
      }

      await setDoc(serverRef, initialServerData);
      
      // --- Image Handling - AFTER initial doc creation ---
      let finalImageUrl: string | null = null;
      if (tempImageUrl && tempImageUrl.includes('temp_server_images')) {
        try {
          const movedImageUrl = await moveServerImageToPermanent(tempImageUrl, serverRef.id);
          if (movedImageUrl) {
            finalImageUrl = movedImageUrl;
            // Update the server document with the permanent image URL
            await updateDoc(serverRef, { 
              server_img_url: finalImageUrl,
              updatedAt: new Date() // Update timestamp
            });
            
            // Clean up *all* temp images for the user after successful move and update
            await cleanupTempServerImages(user.value.uid); 

          } else {
            // Handle case where move function returns null/undefined without throwing
            console.warn(`moveServerImageToPermanent returned null/undefined for server ${serverRef.id}.`);
            showToast('Server created, but failed to finalize server image.', 'warning');
          }
        } catch (imageError) {
          // Use handleStorageError for user message
          const userMessage = handleStorageError(imageError);
          console.error(`Error moving/updating server image for server ${serverRef.id}:`, imageError);
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
      
      // Create owner member record
      await setDoc(doc(firestore, 'servers', serverRef.id, 'members', user.value.uid), {
        userId: user.value.uid,
        role: 'owner',
        joinedAt: now,
        groupIds: [] 
      });
      
      showToast('Server created successfully!', 'success');
      
      await loadUserServers(); 
      return null;

    } catch (error: any) {
      const userMessage = handleDatabaseError(error); 
      console.error('Error during server creation process:', error); 
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
    
    try {
      // Check if the server exists
      const serverRef = doc(firestore, 'servers', serverId);
      const serverDoc = await getDoc(serverRef);
      
      if (!serverDoc.exists()) {
        showToast('Server not found', 'error');
        return false;
      }
      
      // Update the metadata with the current timestamp
      await updateDoc(serverRef, {
        ...metadata,
        updatedAt: new Date()
      });
      
      // Update the local state to reflect changes
      if (serverData.value[serverId]) {
        serverData.value[serverId] = {
          ...serverData.value[serverId],
          ...metadata,
          updatedAt: new Date()
        };
      }
      
      return true;
    } catch (error) {
      console.error('Error updating server metadata:', error);
      const userMessage = handleDatabaseError(error);
      showToast(`Failed to update server: ${userMessage}`, 'error');
      return false;
    }
  };

  // Watch for route changes to update current server
  if (process.client) {
    watch(() => route.params.serverId, async (newServerId) => {
      if (newServerId && typeof newServerId === 'string') {
        await setCurrentServer(newServerId);
      }
    }, { immediate: true });
  }

  // On client-side mount, initialize the current server from route or stored value
  if (process.client) {
    onMounted(async () => {
      if (currentServerId.value) {
        await setCurrentServer(currentServerId.value);
      }
    });
  }

  return {
    userServers,
    serverData,
    isLoading,
    isCreatingServer,
    currentServer,
    currentServerId,
    
    loadUserServers,
    createServer,
    updateServerMetadata,
    setCurrentServer
  };
};