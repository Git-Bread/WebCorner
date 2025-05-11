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
  const { userServers, loadUserServers, setCurrentServer, serverData, saveServerBasicInfoToCache } = useServerCore();
  
  // State
  const isJoiningServer = ref(false);
  
  // Reference to Cloud Function
  const joinServerMemberFunction = httpsCallable(functions, 'joinServerMember');
  
  /**
   * Join an existing server using direct server ID
   * @returns Promise with the joined serverId if successful, or null on failure
   */ 
  const joinServer = async (serverId: string): Promise<string | null> => {
    if (!user.value) {
      showToast('Please log in to join servers', 'error');
      return null;
    }
    
    if (!serverId || serverId.trim() === '') {
      showToast('Invalid server ID', 'error');
      return null;
    }
    
    isJoiningServer.value = true;
    
    try {
      // Check if server exists before attempting to join
      const serverRef = doc(firestore, 'servers', serverId.trim());
      const serverDoc = await getDoc(serverRef);
      
      if (!serverDoc.exists()) {
        showToast('Server not found', 'error');
        return null;
      }
      
      // IMPORTANT: Load the latest user servers before checking membership
      await loadUserServers();
      
      // Check if user is already a member
      const isAlreadyMember = userServers.value.some(s => s.serverId === serverId.trim());
      
      if (isAlreadyMember) {
        showToast('You are already a member of this server', 'info');
        // Add a small delay to show the loading state for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
        // If they're already a member, still return the ID so we can navigate to it
        return serverId.trim();
      }
        
      // Call the Cloud Function to handle all server joining operations
      try {
        await joinServerMemberFunction({ serverId: serverId.trim() });
      } catch (error: any) {
        console.error('Error joining server:', error);
        
        // Extract the error message from the Cloud Function if available
        let errorMessage = 'Failed to join server';
        if (error.code === 'already-exists' || 
            (error.message && error.message.includes('already a member'))) {
          errorMessage = 'You are already a member of this server';
          // If they're already a member, still return the ID so we can navigate to it
          await loadUserServers(); // Refresh user servers
          return serverId.trim();
        } else if (error.details?.message) {
          errorMessage = error.details.message;
        }
        
        showToast(errorMessage, 'error');
        return null;
      }
      
      showToast('Server joined successfully!', 'success');
      
      const joinedServerId = serverId.trim();
      console.log(`Successfully joined server: ${joinedServerId}`);
      
      // Reload user servers to update UI with the new server data
      await loadUserServers();
      console.log(`User servers reloaded after joining ${joinedServerId}`);
      
      // Save basic server info to localStorage
      saveServerBasicInfoToCache();
      
      // No navigation - let the caller handle UI updates
      // Return the serverId on success
      return joinedServerId;
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