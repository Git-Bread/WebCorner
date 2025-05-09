import { ref } from 'vue';
import { httpsCallable } from 'firebase/functions';
import { showToast } from '~/utils/toast';
import { createServerInvite, getInviteByCode, getServerInvites } from '~/utils/inviteUtils';
import { isInviteValid, type ServerInvite } from '~/schemas/serverInviteSchemas';
import { useServerCore } from './useServerCore';
import { useServerPermissions } from './useServerPermissions';

/**
 * Composable for server invitation operations
 */
export const useServerInvitations = () => {
  const { firestore, functions } = useFirebase();
  const { user } = useAuth();
  const { userServers, serverData, loadUserServers, setCurrentServer } = useServerCore();
  const { isServerAdminOrOwner } = useServerPermissions();
  
  // State
  const isJoiningServer = ref(false);
  const activeInvites = ref<ServerInvite[]>([]);
  const isLoadingInvites = ref(false);
    // Create references to Cloud Functions
  const incrementInviteUsageFunction = httpsCallable(functions, 'incrementInviteUsage');
  const joinServerMemberFunction = httpsCallable(functions, 'joinServerMember');
  
  /**
   * Clear active invites array
   */
  const clearActiveInvites = () => {
    activeInvites.value = [];
  };
  
  /**
   * Load all active invites for a server
   */
  const loadServerInvites = async (serverId: string): Promise<ServerInvite[]> => {
    if (!user.value || !serverId) return [];
    
    isLoadingInvites.value = true;
    
    try {
      const invites = await getServerInvites(firestore, serverId);
      activeInvites.value = invites;
      return invites;
    } catch (error) {
      console.error('Error loading server invites:', error);
      showToast('Failed to load server invites', 'error');
      return [];
    } finally {
      isLoadingInvites.value = false;
    }
  };
  
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
   * @returns Promise with the joined serverId if successful, or null on failure
   */
  const joinServerWithInvite = async (inviteCode: string): Promise<string | null> => {
    if (!user.value || !inviteCode) return null;
    
    isJoiningServer.value = true;
    
    try {
      // Fetch the invitation details
      const invite = await getInviteByCode(firestore, inviteCode);
      
      if (!invite) {
        showToast('Invalid invitation code', 'error');
        return null;
      }
      
      // Check if the invitation is valid (not expired, not over max uses)
      if (!isInviteValid(invite)) {
        showToast('This invitation has expired or reached its usage limit', 'error');
        return null;
      }
      
      // IMPORTANT: Load the latest user servers before checking membership
      await loadUserServers();
      
      // Check if user is already a member of this server
      const safeUserServers = Array.isArray(userServers.value) ? userServers.value : [];
      const isAlreadyMember = safeUserServers.some(s => s.serverId === invite.serverId);
      if (isAlreadyMember) {
        showToast('You are already a member of this server', 'info');
        // Add a small delay to show the loading state for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
        // If they're already a member, still return the ID so we can navigate to it
        return invite.serverId;
      }
      
      // Call the Cloud Function to handle all server joining operations
      try {
        await joinServerMemberFunction({ serverId: invite.serverId });
      } catch (joinError: any) {
        // Handle potential errors from joinServerMemberFunction
        console.error('Error during server join operation:', joinError);
        let errorMessage = 'Failed to join server';
        if (joinError.code === 'already-exists' || 
            (joinError.message && joinError.message.includes('already a member'))) {
          errorMessage = 'You are already a member of this server';
          // If they're already a member, still return the ID so we can navigate to it
          await loadUserServers(); // Refresh user servers
          return invite.serverId;
        } else if (joinError.details?.message) {
          errorMessage = joinError.details.message;
        }
        showToast(errorMessage, 'error', 3000);
        return null; // Stop execution if join fails
      }
      
      // Increment the invite use count separately
      // This is done separately so that server joining can succeed even if this fails
      if (invite.id) {
        incrementInviteCount(invite.id).catch(() => {
          // Non-critical error, so we don't necessarily stop the whole process
        });
      }      showToast('Server joined successfully!', 'success');
      console.log(`Successfully joined server with invite: ${invite.serverId}`);
      
      // Reload user servers to update UI with the new server data
      await loadUserServers();
      console.log(`User servers reloaded after joining server ${invite.serverId} with invite`);
      
      // No navigation - let the caller handle UI updates
      return invite.serverId; // Return the serverId on success

    } catch (error: any) {
      console.error('Error joining server with invite:', error);
      // General error handling for the overall process
      let errorMessage = 'Failed to join server using invite';
      if (error.details?.message) { // Check if it's a Firebase Functions error
        errorMessage = error.details.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      showToast(errorMessage, 'error');
      return null;
    } finally {
      isJoiningServer.value = false;
    }
  };  /**
   * Helper function to increment the invite use count
   * This is separated to avoid blocking the main joining process
   */
  const incrementInviteCount = async (inviteCode: string): Promise<void> => {    
    try {
      // Additional validation check
      if (!inviteCode || inviteCode.trim() === '') {
        return;
      }
      
      await incrementInviteUsageFunction({ inviteCode });
    } catch {
      // Non-blocking error, silently continue as this is non-critical
    }
  };
  
  return {
    generateServerInvite,
    joinServerWithInvite,
    loadServerInvites,
    clearActiveInvites,
    activeInvites,
    isLoadingInvites,
    isJoiningServer
  };
};