import { ref } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { showToast } from '~/utils/toast';
import { shouldLog } from '~/utils/debugUtils';
import { serverCache } from '~/utils/storageUtils/cacheUtil';
import { useServerCore } from './useServerCore';

/**
 * Interface for server join result
 */
export interface ServerJoinResult {
  serverId: string;
  success: boolean;
  reason?: string;
  isExistingMember?: boolean;
}

/**
 * Interface for join error details
 */
interface JoinErrorDetails {
  code?: string;
  message?: string;
  details?: {
    message: string;
    [key: string]: any;
  };
}

// Subsystem name for logging
const SUBSYSTEM = 'server-join';

/**
 * Composable for server joining operations
 */
export const useServerJoining = () => {
  const { firestore, functions } = useFirebase();
  const { user } = useAuth();
  const { userServers, loadUserServers, saveServerListToCache } = useServerCore();
  
  // State
  const isJoiningServer = ref(false);
  const lastJoinedServerId = ref<string | null>(null);
  
  // PRIVATE METHODS
  
  /**
   * Logs debug information
   */
  const logDebug = (message: string, ...data: any[]): void => {
    if (shouldLog(SUBSYSTEM)) {
      console.log(`[ServerJoin] ${message}`, ...data);
    }
  };
  
  /**
   * Logs an error and returns a fallback value
   */
  const logError = <T>(context: string, error: unknown, fallback: T): T => {
    if (shouldLog(SUBSYSTEM)) {
      console.error(`[ServerJoin] ${context}:`, error);
    }
    return fallback;
  };
  
  /**
   * Extract error message from Cloud Function error
   */
  const getErrorMessageFromCloudFunction = (error: JoinErrorDetails): string => {
    if (error.code === 'already-exists' || 
        (error.message && error.message.includes('already a member'))) {
      return 'You are already a member of this server';
    } else if (error.details?.message) {
      return error.details.message;
    }
    return 'Failed to join server';
  };
  
  /**
   * Check if user is already a member of the server
   */
  const checkExistingMembership = (serverId: string): boolean => {
    return userServers.value.some(s => s.serverId === serverId);
  };
  
  /**
   * Verify server exists before trying to join
   */
  const verifyServerExists = async (serverId: string): Promise<boolean> => {
    try {
      const serverRef = doc(firestore, 'servers', serverId);
      const serverDoc = await getDoc(serverRef);
      return serverDoc.exists();
    } catch (error) {
      logError('verifyServerExists', error, false);
      return false;
    }
  };
  
  // PUBLIC API
  
  /**
   * Reset join state
   */
  const resetJoinState = (): void => {
    isJoiningServer.value = false;
    lastJoinedServerId.value = null;
  };
  
  /**
   * Join an existing server using direct server ID
   * 
   * @param serverId The ID of the server to join
   * @param options Additional options for joining
   * @returns Promise with join result containing serverId if successful
   */ 
  const joinServer = async (
    serverId: string, 
    options: { skipMembershipCheck?: boolean } = {}
  ): Promise<ServerJoinResult> => {
    // Validate inputs
    if (!user.value) {
      showToast('Please log in to join servers', 'error');
      return { serverId: '', success: false, reason: 'Not logged in' };
    }
    
    if (!serverId || serverId.trim() === '') {
      showToast('Invalid server ID', 'error');
      return { serverId: '', success: false, reason: 'Invalid server ID' };
    }
    
    const sanitizedServerId = serverId.trim();
    
    // Set joining state
    isJoiningServer.value = true;
    lastJoinedServerId.value = null;
    
    try {
      logDebug(`Attempting to join server: ${sanitizedServerId}`);
      
      // First verify server exists
      const serverExists = await verifyServerExists(sanitizedServerId);
      if (!serverExists) {
        logDebug(`Server not found: ${sanitizedServerId}`);
        showToast('Server not found', 'error');
        return { serverId: sanitizedServerId, success: false, reason: 'Server not found' };
      }
      
      // Skip membership check if requested
      if (!options.skipMembershipCheck) {
        // Load latest user servers before checking membership
        await loadUserServers();
        
        // Check if user is already a member
        const isAlreadyMember = checkExistingMembership(sanitizedServerId);
        
        if (isAlreadyMember) {
          logDebug(`User is already a member of server: ${sanitizedServerId}`);
          showToast('You are already a member of this server', 'info');
          return { 
            serverId: sanitizedServerId, 
            success: true, 
            isExistingMember: true,
            reason: 'Already a member' 
          };
        }
      }
      
      // Initialize Cloud Function reference only when needed
      const joinServerMemberFunction = httpsCallable(functions, 'joinServerMember');
        
      // Call the Cloud Function to handle all server joining operations
      logDebug(`Calling Cloud Function to join server: ${sanitizedServerId}`);
      
      try {
        const result = await joinServerMemberFunction({ serverId: sanitizedServerId });
        logDebug('Join server Cloud Function completed successfully', result.data);
      } catch (error: any) {
        // Handle specific Cloud Function errors
        const errorMessage = getErrorMessageFromCloudFunction(error);
        logError(`joinServerMemberFunction(${sanitizedServerId})`, error, null);
        
        // Special case for "already a member" errors
        if (error.code === 'already-exists' || 
            (error.message && error.message.includes('already a member'))) {
          
          // Refresh user servers to ensure UI is up to date
          await loadUserServers();
          
          return { 
            serverId: sanitizedServerId, 
            success: true, 
            isExistingMember: true,
            reason: 'Already a member' 
          };
        }
        
        showToast(errorMessage, 'error');
        return { 
          serverId: sanitizedServerId,
          success: false, 
          reason: errorMessage 
        };
      }
      
      // Server joined successfully
      showToast('Server joined successfully!', 'success');
      lastJoinedServerId.value = sanitizedServerId;
      
      logDebug(`Successfully joined server: ${sanitizedServerId}`);
      
      // Update UI and cache
      await loadUserServers();
      
      // Update cache with server list (user servers have been refreshed)
      saveServerListToCache();
      
      return { 
        serverId: sanitizedServerId, 
        success: true 
      };
    } catch (error: any) {
      // Handle general errors
      const errorMessage = getErrorMessageFromCloudFunction(error);
      logError(`joinServer(${sanitizedServerId})`, error, null);
      
      showToast(errorMessage, 'error');
      return { 
        serverId: sanitizedServerId, 
        success: false, 
        reason: errorMessage 
      };
    } finally {
      isJoiningServer.value = false;
    }
  };
  
  /**
   * Get server ID of last successful join operation
   */
  const getLastJoinedServerId = (): string | null => {
    return lastJoinedServerId.value;
  };

  return {
    // State
    isJoiningServer,
    
    // Methods
    joinServer,
    resetJoinState,
    getLastJoinedServerId
  };
};