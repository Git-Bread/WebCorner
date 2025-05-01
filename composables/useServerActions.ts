import { ref } from 'vue';
import { collection, doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { serverSchema } from '~/schemas/serverSchemas';
import type { ServerRef } from '~/schemas/userSchemas';
import { showToast } from '~/utils/toast';
import { cleanupTempServerImages, moveServerImageToPermanent } from '~/utils/imageUtils/imageUploadUtils';
// Import error handlers
import { handleDatabaseError, handleStorageError } from '~/utils/errorHandler';

export const useServerActions = () => {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  
  // State
  const userServers = ref<ServerRef[]>([]);
  const serverData = ref<Record<string, any>>({});
  const isLoading = ref(false);
  const isCreatingServer = ref(false);
  const isJoiningServer = ref(false);
  
  //Load user's servers from Firestore
  const loadUserServers = async (): Promise<void> => {
    if (!user.value) return;
    
    isLoading.value = true;
    
    try {
      const userDoc = await getDoc(doc(firestore, 'users', user.value.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userServers.value = userData.servers || [];
        
        // Load server details for each server
        serverData.value = {};
        for (const server of userServers.value) {
          try {
            const serverDoc = await getDoc(doc(firestore, 'servers', server.serverId));
            if (serverDoc.exists()) {
              serverData.value[server.serverId] = serverDoc.data();
            }
          } catch (error) {
            console.error(`Error loading server ${server.serverId}:`, error);
          }
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
   * Create a new server
   * @returns Promise<string | null> - Returns null on success, or an error message string on failure.
   */
  const createServer = async (serverInfo: { 
    name: string; 
    description: string;
    server_img_url?: string | null; 
    maxMembers?: number;
    components?: Record<string, boolean>;
  }): Promise<string | null> => { // Changed return type
    if (!user.value) {
      return "User not authenticated."; // Return error message
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
        return 'Server information is invalid. Please check the fields.'; // Return error message
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
      
      // Reload user servers to reflect the new server
      await loadUserServers(); 
      return null; // Return null on success

    } catch (error: any) {
      // Use handleDatabaseError for user message (or a more general handler if needed)
      const userMessage = handleDatabaseError(error); // Assuming most errors here are DB related
      console.error('Error during server creation process:', error); // Keep detailed log
      // Return the user-friendly error message
      return `Failed to create server: ${userMessage}`; 
    } finally {
      isCreatingServer.value = false;
    }
  };
  
  //Join an existing server
  const joinServer = async (serverId: string): Promise<boolean> => {
    if (!user.value || !serverId) return false; 
    const currentUserId = user.value.uid; 
    
    isJoiningServer.value = true;
    
    try {
      // Check if server exists
      const serverRef = doc(firestore, 'servers', serverId.trim());
      const serverDoc = await getDoc(serverRef);
      
      if (!serverDoc.exists()) {
        showToast('Server not found', 'error');
        return false;
      }
      
      // Check if user is already a member
      // Use currentUserId which is guaranteed non-null
      const isAlreadyMember = userServers.value.some(s => s.serverId === serverId.trim());
      
      if (isAlreadyMember) {
        showToast('You are already a member of this server', 'info');
        return false;
      }
      
      // Add user to server members
      const now = new Date();
      await setDoc(doc(firestore, 'servers', serverId.trim(), 'members', currentUserId), {
        userId: currentUserId,
        role: 'member',
        joinedAt: now,
        groupIds: []
      });
      
      // Add server to user's servers
      await updateDoc(doc(firestore, 'users', currentUserId), {
        servers: arrayUnion({
          serverId: serverId.trim(),
          joinedAt: now
        })
      });
      
      // Update server member count - Safely access serverDoc data
      const currentMemberCount = serverDoc.data()?.memberCount || 0; // Use optional chaining and default
      await updateDoc(serverRef, {
        memberCount: currentMemberCount + 1
      });
      
      showToast('Server joined successfully!', 'success');
      
      // Reload user servers
      await loadUserServers();
      return true;
    } catch (error) {
      console.error('Error joining server:', error);
      showToast('Failed to join server', 'error');
      return false;
    } finally {
      isJoiningServer.value = false;
    }
  };
  
  /**
   * Get the name of a server by its ID
   */
  const getServerName = (serverId: string): string => {
    return serverData.value[serverId]?.name || 'Unknown Server';
  };
  
  /**
  
  /**
   * Get the first letter of a server's name
   */
  const getServerInitial = (serverId: string): string => {
    const name = getServerName(serverId);
    return name.charAt(0).toUpperCase();
  };
  
  /**
   * Get the description of a server by its ID
   */
  const getServerDescription = (serverId: string): string => {
    return serverData.value[serverId]?.description || '';
  };
  
  /**
   * Get the member count of a server by its ID
   */
  const getMemberCount = (serverId: string): number => {
    // Ensure serverData.value exists before accessing
    return serverData.value?.[serverId]?.memberCount || 1; 
  };

  return {
    // State
    userServers,
    serverData,
    isLoading,
    isCreatingServer,
    isJoiningServer,
    
    // Methods
    loadUserServers,
    createServer,
    joinServer,
    
    // Helper functions
    getServerName,
    getServerInitial,
    getServerDescription,
    getMemberCount
  };
};