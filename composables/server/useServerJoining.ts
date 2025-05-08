import { ref } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { showToast } from '~/utils/toast';
import { useServerCore } from './useServerCore';

/**
 * Composable for server joining operations
 */
export const useServerJoining = () => {
  const { firestore, functions } = useFirebase();
  const { user } = useAuth();
  const { userServers, loadUserServers } = useServerCore();
  
  // State
  const isJoiningServer = ref(false);
  
  // Reference to Cloud Function
  const joinServerMemberFunction = httpsCallable(functions, 'joinServerMember');
  
  /**
   * Join an existing server using direct server ID
   * @returns Promise with the joined serverId if successful, or null on failure
   */
  const joinServer = async (serverId: string): Promise<string | null> => {
    if (!user.value || !serverId) return null; 
    
    isJoiningServer.value = true;
    
    try {
      // Check if server exists before attempting to join
      const serverRef = doc(firestore, 'servers', serverId.trim());
      const serverDoc = await getDoc(serverRef);
      
      if (!serverDoc.exists()) {
        showToast('Server not found', 'error');
        return null;
      }
      
      // Check if user is already a member
      const isAlreadyMember = userServers.value.some(s => s.serverId === serverId.trim());
      
      if (isAlreadyMember) {
        showToast('You are already a member of this server', 'info');
        return null;
      }
      
      // Call the Cloud Function to handle all server joining operations
      const result = await joinServerMemberFunction({ serverId: serverId.trim() });
      
      showToast('Server joined successfully!', 'success');
      
      // Reload user servers to update UI
      await loadUserServers();
      
      // Return the serverId on success
      return serverId.trim();
    } catch (error: any) {
      console.error('Error joining server:', error);
      
      // Extract the error message from the Cloud Function if available
      let errorMessage = 'Failed to join server';
      if (error.code === 'already-exists') {
        errorMessage = 'You are already a member of this server';
      } else if (error.details?.message) {
        errorMessage = error.details.message;
      }
      
      showToast(errorMessage, 'error');
      return null;
    } finally {
      isJoiningServer.value = false;
    }
  };

  return {
    isJoiningServer,
    joinServer
  };
};