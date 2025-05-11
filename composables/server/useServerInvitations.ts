import { ref } from 'vue';
import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, setDoc, query, where, limit } from 'firebase/firestore';
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
  const { userServers, serverData, loadUserServers, setCurrentServer, saveServerBasicInfoToCache } = useServerCore();
  const { isServerAdminOrOwner } = useServerPermissions();
  
  // State
  const isJoiningServer = ref(false);
  const activeInvites = ref<ServerInvite[]>([]);
  const isLoadingInvites = ref(false);
  const isGeneratingInvite = ref(false);
    // Create references to Cloud Functions
  const incrementInviteUsageFunction = httpsCallable(functions, 'incrementInviteUsage');
  const joinServerMemberFunction = httpsCallable(functions, 'joinServerMember');
  const joinWithInviteFunction = httpsCallable(functions, 'joinServerWithInvite');
  
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
   * @returns Promise with the server ID if successful, or null on failure
   */
  const joinServerWithInvite = async (inviteCode: string): Promise<string | null> => {
    if (!user.value || !inviteCode || inviteCode.trim() === '') {
      showToast('Invalid invitation code', 'error');
      return null;
    }
    
    isJoiningServer.value = true;
    
    try {
      // Call the Cloud Function to join the server with the invite code
      console.log(`Attempting to join server with invite code: ${inviteCode}`);
      await joinWithInviteFunction({ inviteCode });
      
      showToast('Server joined successfully!', 'success');
      
      // Also increment the invitation use count in a non-blocking way
      incrementInviteCount(inviteCode).catch(error => {
        console.error('Error incrementing invite count:', error);
        // Non-critical error, don't block the user flow
      });
      
      // Get the server details from the invitation
      const invite = await getInviteByCode(firestore, inviteCode);
      if (!invite) {
        console.error('Could not retrieve invite details after joining');
        return null;
      }
      
      // Reload user servers to update UI with the new server data
      await loadUserServers();
      console.log(`User servers reloaded after joining server ${invite.serverId} via invite`);
      
      // Save basic server info to localStorage
      saveServerBasicInfoToCache();
      
      // No navigation - let the caller handle UI updates
      return invite.serverId; // Return the serverId on success
    } catch (error: any) {
      console.error('Error joining server with invite:', error);
      
      // Extract the error message
      let errorMessage = 'Failed to join server with invite';
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
  
  /**
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