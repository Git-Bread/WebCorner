import { ref } from 'vue';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { showToast } from '~/utils/toast';
import { createServerInvite, getInviteByCode, incrementInviteUseCount } from '~/utils/inviteUtils';
import { isInviteValid, type ServerInvite } from '~/schemas/serverInviteSchemas';
import { useServerCore } from './useServerCore';
import { useServerPermissions } from './useServerPermissions';

/**
 * Composable for server invitation operations
 */
export const useServerInvitations = () => {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { userServers, serverData, loadUserServers } = useServerCore();
  const { isServerAdminOrOwner } = useServerPermissions();
  
  // State
  const isJoiningServer = ref(false);
  
  /**
   * Generate a server invite
   */
  const generateServerInvite = async (
    serverId: string, 
    options: {
      expiresInMs?: number;
      maxUses?: number;
    } = {}
  ): Promise<string | null> => {
    if (!user.value || !serverId) return null;
    
    try {
      // Check if user has permission to create invites
      const hasPermission = await isServerAdminOrOwner(serverId);
      if (!hasPermission) {
        showToast('You do not have permission to create invites for this server', 'error');
        return null;
      }
      
      // Get server name for the invite
      const serverName = serverData.value[serverId]?.name || 'Unknown Server';
      
      // Create the invite
      const inviteCode = await createServerInvite(
        firestore,
        serverId,
        user.value.uid,
        {
          expiresInMs: options.expiresInMs,
          maxUses: options.maxUses,
          serverName
        }
      );
      
      if (inviteCode) {
        showToast('Server invite created successfully', 'success');
        return inviteCode;
      } else {
        showToast('Failed to create server invite', 'error');
        return null;
      }
    } catch (error) {
      console.error('Error generating server invite:', error);
      showToast('Failed to create server invite', 'error');
      return null;
    }
  };
  
  /**
   * Join a server using an invitation code
   */
  const joinServerWithInvite = async (inviteCode: string): Promise<boolean> => {
    if (!user.value || !inviteCode) return false;
    const currentUserId = user.value.uid;
    
    isJoiningServer.value = true;
    
    try {
      // Fetch the invitation details
      const invite = await getInviteByCode(firestore, inviteCode);
      
      if (!invite) {
        showToast('Invalid invitation code', 'error');
        return false;
      }
      
      // Check if the invitation is valid (not expired, not over max uses)
      if (!isInviteValid(invite)) {
        showToast('This invitation has expired or reached its usage limit', 'error');
        return false;
      }
      
      // Check if user is already a member of this server
      const isAlreadyMember = userServers.value.some(s => s.serverId === invite.serverId);
      
      if (isAlreadyMember) {
        showToast('You are already a member of this server', 'info');
        return false;
      }
      
      // Add user to server members
      const now = new Date();
      await setDoc(doc(firestore, 'servers', invite.serverId, 'members', currentUserId), {
        userId: currentUserId,
        role: 'member',
        joinedAt: now,
        groupIds: []
      });
      
      // Add server to user's servers
      await updateDoc(doc(firestore, 'users', currentUserId), {
        servers: arrayUnion({
          serverId: invite.serverId,
          joinedAt: now
        })
      });
      
      // Update server member count
      const serverRef = doc(firestore, 'servers', invite.serverId);
      const serverDoc = await getDoc(serverRef);
      
      if (serverDoc.exists()) {
        const currentMemberCount = serverDoc.data()?.memberCount || 0;
        await updateDoc(serverRef, {
          memberCount: currentMemberCount + 1
        });
      }
      
      // Increment the invitation use count
      await incrementInviteUseCount(firestore, inviteCode);
      
      showToast('Server joined successfully!', 'success');
      
      // Reload user servers
      await loadUserServers();
      return true;
    } catch (error) {
      console.error('Error joining server with invite:', error);
      showToast('Failed to join server', 'error');
      return false;
    } finally {
      isJoiningServer.value = false;
    }
  };
  
  return {
    generateServerInvite,
    joinServerWithInvite,
    isJoiningServer
  };
};