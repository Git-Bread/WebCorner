import { ref } from 'vue';
import { collection, doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { serverSchema } from '~/schemas/serverSchemas';
import type { ServerRef } from '~/schemas/userSchemas';
import { showToast } from '~/utils/toast';

export const useServerActions = () => {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  
  // State
  const userServers = ref<ServerRef[]>([]);
  const serverData = ref<Record<string, any>>({});
  const isLoading = ref(false);
  const isCreatingServer = ref(false);
  const isJoiningServer = ref(false);
  
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
   */
  const createServer = async (serverInfo: { 
    name: string; 
    description: string;
    server_img_url?: string | null;
    maxMembers?: number;
    components?: Record<string, boolean>;
  }): Promise<boolean> => {
    if (!user.value) return false;
    
    isCreatingServer.value = true;
    
    try {
      // Create server data
      const now = new Date();
      const newServerData = {
        name: serverInfo.name,
        description: serverInfo.description || '',
        server_img_url: serverInfo.server_img_url || null,
        ownerId: user.value.uid,
        createdAt: now,
        updatedAt: now,
        memberCount: 1,
        maxMembers: serverInfo.maxMembers || 100,
        settings: {},
        components: serverInfo.components || {
          news: true,
          groups: true,
          chat: true
        }
      };
      
      // Validate server data
      const validationResult = serverSchema.safeParse({
        ...newServerData
      });
      
      if (!validationResult.success) {
        throw new Error('Server data is invalid: ' + JSON.stringify(validationResult.error));
      }
      
      // Create server document
      const serverRef = doc(collection(firestore, 'servers'));
      await setDoc(serverRef, newServerData);
      
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
      
      // Reload user servers
      await loadUserServers();
      return true;
    } catch (error) {
      console.error('Error creating server:', error);
      showToast('Failed to create server', 'error');
      return false;
    } finally {
      isCreatingServer.value = false;
    }
  };
  
  /**
   * Join an existing server
   */
  const joinServer = async (serverId: string): Promise<boolean> => {
    if (!user.value || !serverId) return false;
    
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
      const isAlreadyMember = userServers.value.some(s => s.serverId === serverId.trim());
      
      if (isAlreadyMember) {
        showToast('You are already a member of this server', 'info');
        return false;
      }
      
      // Add user to server members
      const now = new Date();
      await setDoc(doc(firestore, 'servers', serverId.trim(), 'members', user.value.uid), {
        userId: user.value.uid,
        role: 'member',
        joinedAt: now,
        groupIds: []
      });
      
      // Add server to user's servers
      await updateDoc(doc(firestore, 'users', user.value.uid), {
        servers: arrayUnion({
          serverId: serverId.trim(),
          joinedAt: now
        })
      });
      
      // Update server member count
      await updateDoc(serverRef, {
        memberCount: serverDoc.data().memberCount + 1
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
    return serverData.value[serverId]?.memberCount || 1;
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