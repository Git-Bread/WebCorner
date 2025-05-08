import { ref } from 'vue';
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
  
  // State
  const userServers = ref<ServerRef[]>([]);
  const serverData = ref<Record<string, any>>({});
  const isLoading = ref(false);
  const isCreatingServer = ref(false);
  
  /**
   * Load user's servers from Firestore
   */
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

  return {
    // State
    userServers,
    serverData,
    isLoading,
    isCreatingServer,
    
    // Methods
    loadUserServers,
    createServer
  };
};