import { ref } from 'vue';
import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, setDoc, query, where, limit } from 'firebase/firestore';
import { showToast } from '~/utils/toast';
import { shouldLog } from '~/utils/debugUtils';
import { setCacheItem, getCacheItem, removeCacheItem } from '~/utils/storageUtils/cacheUtil';
import { type ServerInvite } from '~/schemas/serverInviteSchemas';
import { useServerCore } from './useServerCore';
import { useServerPermissions } from './useServerPermissions';

/**
 * Interface for invitation creation options
 */
export interface InviteCreateOptions {
  expiresInMs?: number;
  maxUses?: number;
  description?: string;
}

/**
 * Interface for invitation creation result
 */
export interface InviteCreateResult {
  success: boolean;
  inviteCode: string | null;
  error?: string;
}

/**
 * Interface for server joining result
 */
export interface InviteJoinResult {
  success: boolean;
  serverId: string | null;
  error?: string;
}

// Cache expiration time in milliseconds
const INVITE_CACHE_EXPIRATION = 10 * 60 * 1000; // 10 minutes

// Cache key prefixes
const INVITE_LIST_CACHE_PREFIX = 'server_invites';
const INVITE_DETAILS_CACHE_PREFIX = 'invite_details';

// Subsystem name for logging
const SUBSYSTEM = 'invitations';

/**
 * Composable for server invitation operations
 */
export const useServerInvitations = () => {
  const { firestore, functions } = useFirebase();
  const { user } = useAuth();
  const { userServers, serverData, loadUserServers, setCurrentServer, saveServerListToCache } = useServerCore();
  const { hasPermission, hasRoleOrHigher } = useServerPermissions();
  
  // State
  const isJoiningServer = ref(false);
  const activeInvites = ref<ServerInvite[]>([]);
  const isLoadingInvites = ref(false);
  const isGeneratingInvite = ref(false);
  
  // Cloud Function references
  const incrementInviteUsageFunction = httpsCallable(functions, 'incrementInviteUsage');
  const joinServerMemberFunction = httpsCallable(functions, 'joinServerMember');
  const joinWithInviteFunction = httpsCallable(functions, 'joinServerWithInvite');
  
  // PRIVATE METHODS
  
  /**
   * Logs debug information
   */
  const logDebug = (message: string, ...data: any[]): void => {
    if (shouldLog(SUBSYSTEM)) {
      console.log(`[Invitations] ${message}`, ...data);
    }
  };
  
  /**
   * Logs an error and returns a fallback value
   */
  const logError = <T>(context: string, error: unknown, fallback: T): T => {
    if (shouldLog(SUBSYSTEM)) {
      console.error(`[Invitations] ${context}:`, error);
    }
    return fallback;
  };
  
  /**
   * Generate cache key for server invites list
   */
  const getInviteListCacheKey = (serverId: string): string => {
    return `${INVITE_LIST_CACHE_PREFIX}_${serverId}`;
  };
  
  /**
   * Generate cache key for invite details
   */
  const getInviteDetailsCacheKey = (inviteCode: string): string => {
    return `${INVITE_DETAILS_CACHE_PREFIX}_${inviteCode}`;
  };
  
  /**
   * Create server invite with given options
   */
  const createServerInvite = async (
    serverId: string,
    userId: string,
    options: InviteCreateOptions = {}
  ): Promise<string | null> => {
    try {
      const serverRef = doc(firestore, 'servers', serverId);
      const serverDoc = await getDoc(serverRef);
      
      if (!serverDoc.exists()) {
        logDebug(`Server not found: ${serverId}`);
        return null;
      }
      
      const serverName = serverDoc.data()?.name || 'Unknown Server';
      const invitesRef = collection(serverRef, 'invites');
      
      // Generate a random 10-character invite code
      const inviteCode = Math.random().toString(36).substring(2, 12);
      
      // Set expiration date if specified
      const expiration = options.expiresInMs 
        ? new Date(Date.now() + options.expiresInMs) 
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default: 7 days
      
      // Create the invite document
      const inviteData: Partial<ServerInvite> = {
        code: inviteCode,
        serverId,
        serverName,
        creatorId: userId,
        createdAt: new Date(),
        useCount: 0,
        expiresAt: expiration,
        maxUses: options.maxUses
      };
      
      // Save the invite
      await setDoc(doc(invitesRef, inviteCode), inviteData);
      logDebug(`Created invitation code: ${inviteCode}`);
      
      // Invalidate the invites cache for this server
      removeCacheItem(getInviteListCacheKey(serverId));
      
      return inviteCode;
    } catch (error) {
      logError(`createServerInvite(${serverId})`, error, null);
      return null;
    }
  };
  
  /**
   * Get invite details by code
   */
  const getInviteByCode = async (inviteCode: string): Promise<ServerInvite | null> => {
    try {
      // Check cache first
      const cacheKey = getInviteDetailsCacheKey(inviteCode);
      const cachedInvite = getCacheItem<ServerInvite>(cacheKey);
      
      if (cachedInvite) {
        logDebug(`Using cached invite details for: ${inviteCode}`);
        return cachedInvite;
      }
      
      // Query for the invite across all servers
      const allServersRef = collection(firestore, 'servers');
      const allServers = await getDocs(allServersRef);
      
      for (const serverDoc of allServers.docs) {
        const serverId = serverDoc.id;
        const inviteRef = doc(firestore, 'servers', serverId, 'invites', inviteCode);
        const inviteDoc = await getDoc(inviteRef);
        
        if (inviteDoc.exists()) {
          const inviteData = inviteDoc.data() as ServerInvite;
          
          // Cache the invite
          setCacheItem(cacheKey, inviteData, INVITE_CACHE_EXPIRATION, true);
          
          return inviteData;
        }
      }
      
      logDebug(`Invite code not found: ${inviteCode}`);
      return null;
    } catch (error) {
      logError(`getInviteByCode(${inviteCode})`, error, null);
      return null;
    }
  };
  
  /**
   * Get all server invites
   */
  const getServerInvites = async (serverId: string): Promise<ServerInvite[]> => {
    try {
      // Check cache first
      const cacheKey = getInviteListCacheKey(serverId);
      const cachedInvites = getCacheItem<ServerInvite[]>(cacheKey);
      
      if (cachedInvites) {
        logDebug(`Using cached invites for server: ${serverId}`);
        return cachedInvites;
      }
      
      const serverRef = doc(firestore, 'servers', serverId);
      const invitesRef = collection(serverRef, 'invites');
      const invitesSnapshot = await getDocs(invitesRef);
      
      const invites: ServerInvite[] = [];
      
      invitesSnapshot.forEach(doc => {
        const data = doc.data();
        
        // Convert Firestore timestamps to Date objects if needed
        const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);
        const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt);
        
        // Create a properly typed invite object
        const invite: ServerInvite = {
          id: doc.id,
          code: data.code,
          serverId: data.serverId,
          creatorId: data.creatorId,
          serverName: data.serverName,
          createdAt: createdAt,
          expiresAt: expiresAt,
          useCount: data.useCount || 0,
          maxUses: data.maxUses
        };
        
        invites.push(invite);
      });
      
      // Cache the invites
      setCacheItem(cacheKey, invites, INVITE_CACHE_EXPIRATION, false);
      
      return invites;
    } catch (error) {
      logError(`getServerInvites(${serverId})`, error, []);
      return [];
    }
  };
  
  // PUBLIC API
  
  /**
   * Clear active invites array
   */
  const clearActiveInvites = (): void => {
    activeInvites.value = [];
    logDebug('Cleared active invites');
  };
  
  /**
   * Clear invitation caches
   */
  const clearCache = (serverId?: string): void => {
    if (serverId) {
      removeCacheItem(getInviteListCacheKey(serverId), true);
      logDebug(`Cleared invites cache for server: ${serverId}`);
    } else {
      logDebug('Note: Full cache clear not implemented - need to specify server ID');
    }
  };
  
  /**
   * Load all active invites for a server
   */
  const loadServerInvites = async (serverId: string, forceFresh = false): Promise<ServerInvite[]> => {
    if (!user.value || !serverId) return [];
    
    isLoadingInvites.value = true;
    
    try {
      logDebug(`Loading invites for server: ${serverId}`);
      
      // Force fresh means skip cache
      if (forceFresh) {
        clearCache(serverId);
      }
      
      const invites = await getServerInvites(serverId);
      activeInvites.value = invites;
      
      logDebug(`Loaded ${invites.length} invites for server: ${serverId}`);
      return invites;
    } catch (error) {
      logError(`loadServerInvites(${serverId})`, error, []);
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
    options: InviteCreateOptions = {}
  ): Promise<InviteCreateResult> => {
    if (!user.value || !serverId) {
      return { success: false, inviteCode: null, error: 'User not logged in or invalid server ID' };
    }
    
    isGeneratingInvite.value = true;
    
    try {
      logDebug(`Generating invite for server: ${serverId}`);
      
      // Check if user has permission to create invites
      const canCreateInvites = await hasPermission(serverId, 'canInviteMembers');
      if (!canCreateInvites) {
        logDebug(`User does not have permission to create invites`);
        showToast('You do not have permission to create invites for this server', 'error');
        return { success: false, inviteCode: null, error: 'Permission denied' };
      }
      
      // Create the invite
      const inviteCode = await createServerInvite(
        serverId,
        user.value.uid,
        options
      );
      
      if (inviteCode) {
        logDebug(`Successfully created invite: ${inviteCode}`);
        showToast('Server invite created successfully', 'success');
        
        // Reload invites to update the list
        await loadServerInvites(serverId, true);
        
        return { success: true, inviteCode };
      } else {
        logDebug(`Failed to create invite`);
        showToast('Failed to create server invite', 'error');
        return { success: false, inviteCode: null, error: 'Failed to create invite' };
      }
    } catch (error) {
      logError(`generateServerInvite(${serverId})`, error, null);
      showToast('Failed to create server invite', 'error');
      return { success: false, inviteCode: null, error: 'Error creating invite' };
    } finally {
      isGeneratingInvite.value = false;
    }
  };
  
  /**
   * Join a server using an invitation code
   */
  const joinServerWithInvite = async (inviteCode: string): Promise<InviteJoinResult> => {
    if (!user.value || !inviteCode || inviteCode.trim() === '') {
      showToast('Invalid invitation code', 'error');
      return { success: false, serverId: null, error: 'Invalid invitation code' };
    }
    
    isJoiningServer.value = true;
    
    try {
      logDebug(`Attempting to join server with invite code: ${inviteCode}`);
      
      // Call the Cloud Function to join the server with the invite code
      await joinWithInviteFunction({ inviteCode });
      
      // Also increment the invitation use count in a non-blocking way
      incrementInviteCount(inviteCode).catch(error => {
        logError(`incrementInviteCount(${inviteCode})`, error, null);
      });
      
      // Get the server details from the invitation
      const invite = await getInviteByCode(inviteCode);
      if (!invite) {
        logError(`Could not retrieve invite details after joining`, null, null);
        return { success: false, serverId: null, error: 'Could not retrieve invite details' };
      }
      
      // Reload user servers to update UI with the new server data
      await loadUserServers();
      logDebug(`User servers reloaded after joining server ${invite.serverId} via invite`);
      
      // Update server list in cache 
      saveServerListToCache();
      
      showToast('Server joined successfully!', 'success');
      
      // Return the success result with server ID
      return { success: true, serverId: invite.serverId };
    } catch (error: any) {
      // Extract the error message
      let errorMessage = 'Failed to join server with invite';
      if (error.code === 'already-exists') {
        errorMessage = 'You are already a member of this server';
      } else if (error.details?.message) {
        errorMessage = error.details.message;
      }
      
      logError(`joinServerWithInvite(${inviteCode})`, error, null);
      showToast(errorMessage, 'error');
      
      return { success: false, serverId: null, error: errorMessage };
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
      
      logDebug(`Incrementing use count for invite: ${inviteCode}`);
      await incrementInviteUsageFunction({ inviteCode });
      
      // Invalidate the invite cache
      removeCacheItem(getInviteDetailsCacheKey(inviteCode), true);
    } catch (error) {
      // Non-blocking error, log but continue
      logError(`incrementInviteCount(${inviteCode})`, error, null);
    }
  };
  
  /**
   * Deactivate an invite (admin/owner only)
   */
  const deactivateInvite = async (serverId: string, inviteCode: string): Promise<boolean> => {
    if (!user.value || !serverId || !inviteCode) return false;
    
    try {
      logDebug(`Deactivating invite: ${inviteCode}`);
      
      // Check if user has permission to manage invites
      const canManageInvites = await hasPermission(serverId, 'canManageInvites');
      if (!canManageInvites) {
        logDebug(`User does not have permission to manage invites`);
        showToast('You do not have permission to manage invites for this server', 'error');
        return false;
      }
      
      // Reference to the invite document
      const inviteRef = doc(firestore, 'servers', serverId, 'invites', inviteCode);
      
      // Get the current invite
      const inviteDoc = await getDoc(inviteRef);
      if (!inviteDoc.exists()) {
        showToast('Invite not found', 'error');
        return false;
      }
      
      // Set the expiration to now to effectively deactivate it
      const updateData = {
        expiresAt: new Date(), // Set to current time to immediately expire
        deactivatedBy: user.value.uid, // Store who deactivated it (metadata field)
        deactivatedAt: new Date()  // Store when it was deactivated (metadata field)
      };
      
      // Update the invite
      await setDoc(inviteRef, updateData, { merge: true });
      
      // Invalidate caches
      removeCacheItem(getInviteDetailsCacheKey(inviteCode), true);
      removeCacheItem(getInviteListCacheKey(serverId), true);
      
      // Reload invites to update the UI
      await loadServerInvites(serverId, true);
      
      showToast('Invite deactivated successfully', 'success');
      return true;
    } catch (error) {
      logError(`deactivateInvite(${serverId}, ${inviteCode})`, error, false);
      showToast('Failed to deactivate invite', 'error');
      return false;
    }
  };
  
  return {
    // State
    activeInvites,
    isLoadingInvites,
    isJoiningServer,
    isGeneratingInvite,
    
    // Methods
    generateServerInvite,
    joinServerWithInvite,
    loadServerInvites,
    clearActiveInvites,
    clearCache,
    deactivateInvite
  };
};