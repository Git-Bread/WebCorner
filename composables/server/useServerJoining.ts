import { ref } from 'vue';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { showToast } from '~/utils/toast';
import { useServerCore } from './useServerCore';

/**
 * Composable for server joining operations
 */
export const useServerJoining = () => {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { userServers, loadUserServers } = useServerCore();
  
  // State
  const isJoiningServer = ref(false);
  
  /**
   * Join an existing server using direct server ID
   */
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
      const currentMemberCount = serverDoc.data()?.memberCount || 0;
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

  return {
    isJoiningServer,
    joinServer
  };
};