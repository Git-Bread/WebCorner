import { ref } from 'vue';
import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, setDoc, query, where, limit, Timestamp } from 'firebase/firestore';
import { showToast } from '~/utils/toast';
import { shouldLog } from '~/utils/debugUtils';
import { setCacheItem, getCacheItem, removeCacheItem } from '~/utils/storageUtils/cacheUtil';
import { type ServerInvite, validateServerInvite, safeValidateServerInvite } from '~/schemas/serverInviteSchemas';
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
  const { userServers, serverData, loadUserServers, setCurrentServer } = useServerCore();
  const { hasPermission, hasRoleOrHigher } = useServerPermissions();
  
  // State
  const isJoiningServer = ref(false);
  const activeInvites = ref<ServerInvite[]>([]);
  const isLoadingInvites = ref(false);
  const isGeneratingInvite = ref(false);
  
  // Cloud Function reference
  const joinServerMemberFunction = httpsCallable(functions, 'joinServerMember');
  
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
    console.log("[Invite Creation Debug] Starting createServerInvite with:", { serverId, userId, options });
    try {
      const serverRef = doc(firestore, 'servers', serverId);
      const serverDoc = await getDoc(serverRef);
      
      if (!serverDoc.exists()) {
        console.error("[Invite Creation Debug] Server not found:", serverId);
        logDebug(`Server not found: ${serverId}`);
        return null;
      }
      
      const serverName = serverDoc.data()?.name || 'Unknown Server';
      console.log("[Invite Creation Debug] Server found:", { serverName });
      
      // Generate a random invite code that's at least 8 characters long
      // Using a more reliable approach with nanoid-like generation
      const generateCode = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        // Generate a code of at least 10 characters
        for (let i = 0; i < 10; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };
      
      const inviteCode = generateCode();
      console.log("[Invite Creation Debug] Generated invite code:", inviteCode, "Length:", inviteCode.length);
      
      // Set expiration date if specified
      const expiration = options.expiresInMs 
        ? new Date(Date.now() + options.expiresInMs) 
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default: 7 days
      
      // Create the invite document with all required fields
      // Only adding maxUses if it's actually defined
      const inviteData: Record<string, any> = {
        code: inviteCode,
        serverId,
        serverName,
        creatorId: userId,
        createdAt: new Date(),
        useCount: 0,
        expiresAt: expiration
      };
      
      // Only add maxUses field if it's actually defined and not null
      if (options.maxUses !== undefined && options.maxUses !== null) {
        inviteData.maxUses = options.maxUses;
      }
      
      console.log("[Invite Creation Debug] Invite data prepared:", inviteData);
      
      // Validate the data against the schema before saving
      const validationResult = safeValidateServerInvite(inviteData);
      
      if (!validationResult.success) {
        console.error("[Invite Creation Debug] Validation failed:", validationResult.error);
        logError("Schema validation failed", validationResult.error, null);
        return null;
      }
      
      console.log("[Invite Creation Debug] Validation successful");
      
      // Save only in server's invites subcollection
      console.log("[Invite Creation Debug] Saving to server subcollection");
      const invitesRef = collection(serverRef, 'invites');
      await setDoc(doc(invitesRef, inviteCode), inviteData);
      console.log("[Invite Creation Debug] Successfully saved to server subcollection");
      
      logDebug(`Created invitation code: ${inviteCode}`);
      
      // Invalidate the invites cache for this server
      removeCacheItem(getInviteListCacheKey(serverId));
      
      console.log("[Invite Creation Debug] Successfully created invite:", inviteCode);
      return inviteCode;
    } catch (error) {
      console.error("[Invite Creation Debug] Error in createServerInvite:", error);
      logError(`createServerInvite(${serverId})`, error, null);
      return null;
    }
  };
  
  /**
   * Get invite details by code
   */
  const getInviteByCode = async (inviteCode: string): Promise<ServerInvite | null> => {
    try {
      if (!inviteCode || inviteCode.trim() === '') {
        console.log("[Invitation Debug] Empty invite code provided");
        return null;
      }

      console.log("[Invitation Debug] Looking up invite code:", inviteCode);
      
      // Check cache first
      const cacheKey = getInviteDetailsCacheKey(inviteCode);
      const cachedInvite = getCacheItem<ServerInvite>(cacheKey);
      
      if (cachedInvite) {
        console.log("[Invitation Debug] Using cached invite");
        logDebug(`Using cached invite details for: ${inviteCode}`);
        return cachedInvite;
      }
      
      // Check user's servers
      console.log("[Invitation Debug] Checking user servers for invite");
      const servers = Object.keys(userServers.value);
      
      if (servers.length === 0) {
        console.log("[Invitation Debug] User is not a member of any servers");
      } else {
        console.log(`[Invitation Debug] Checking ${servers.length} servers that user is a member of`);
      }
      
      let invite: ServerInvite | null = null;
      
      // Try each server the user is a member of
      for (const serverId of servers) {
        console.log("[Invitation Debug] Checking server:", serverId);
        try {
          const inviteRef = doc(firestore, 'servers', serverId, 'invites', inviteCode);
          const inviteDoc = await getDoc(inviteRef);
          
          if (inviteDoc.exists()) {
            console.log("[Invitation Debug] Found in server:", serverId);
            const rawData = inviteDoc.data();
            
            // Convert Firestore timestamps to Date objects if needed
            const createdAt = rawData.createdAt instanceof Timestamp 
              ? rawData.createdAt.toDate() 
              : new Date(rawData.createdAt);
              
            const expiresAt = rawData.expiresAt instanceof Timestamp 
              ? rawData.expiresAt.toDate() 
              : new Date(rawData.expiresAt);
            
            invite = {
              id: inviteDoc.id,
              code: rawData.code,
              serverId: rawData.serverId || serverId, // Use the serverId from the path if not in the data
              creatorId: rawData.creatorId,
              serverName: rawData.serverName,
              createdAt,
              expiresAt,
              useCount: rawData.useCount || 0,
              maxUses: rawData.maxUses
            };
            
            break;
          }
        } catch (serverError) {
          console.log("[Invitation Debug] Error checking server:", serverId, serverError);
          // Continue to next server
        }
      }
      
      // If invite was found, cache it
      if (invite) {
        // Cache the invite
        setCacheItem(cacheKey, invite, INVITE_CACHE_EXPIRATION, true);
        console.log("[Invitation Debug] Successfully found and cached invite:", invite);
        return invite;
      }
      
      // Not found in any servers
      console.log("[Invitation Debug] Invite not found in any accessible server:", inviteCode);
      console.log("[Invitation Debug] Note: This is expected for invites from servers you're not a member of");
      
      // Return null - we'll let the cloud function handle looking up the invite
      return null;
    } catch (error) {
      console.error("[Invitation Debug] Error in getInviteByCode:", error);
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
    console.log("[Invite Creation Debug] Starting generateServerInvite for server:", serverId, options);
    
    if (!user.value || !serverId) {
      console.error("[Invite Creation Debug] Missing user or serverId:", {
        hasUser: !!user.value,
        serverId
      });
      return { success: false, inviteCode: null, error: 'User not logged in or invalid server ID' };
    }
    
    isGeneratingInvite.value = true;
    
    try {
      logDebug(`Generating invite for server: ${serverId}`);
      
      // Check if user has permission to create invites
      console.log("[Invite Creation Debug] Checking user permissions");
      const canCreateInvites = await hasPermission(serverId, 'canInviteMembers');
      console.log("[Invite Creation Debug] Permission check result:", canCreateInvites);
      
      if (!canCreateInvites) {
        console.error("[Invite Creation Debug] User lacks permission to create invites");
        logDebug(`User does not have permission to create invites`);
        showToast('You do not have permission to create invites for this server', 'error');
        return { success: false, inviteCode: null, error: 'Permission denied' };
      }
      
      // Create the invite
      console.log("[Invite Creation Debug] Calling createServerInvite");
      const inviteCode = await createServerInvite(
        serverId,
        user.value.uid,
        options
      );
      
      if (inviteCode) {
        console.log("[Invite Creation Debug] Invite created successfully:", inviteCode);
        logDebug(`Successfully created invite: ${inviteCode}`);
        showToast('Server invite created successfully', 'success');
        
        // Reload invites to update the list
        console.log("[Invite Creation Debug] Reloading server invites");
        await loadServerInvites(serverId, true);
        
        return { success: true, inviteCode };
      } else {
        console.error("[Invite Creation Debug] Failed to create invite - null returned");
        logDebug(`Failed to create invite`);
        showToast('Failed to create server invite', 'error');
        return { success: false, inviteCode: null, error: 'Failed to create invite' };
      }
    } catch (error) {
      console.error("[Invite Creation Debug] Error in generateServerInvite:", error);
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
      console.log("[Invitation Debug] Invalid input parameters:", { 
        hasUser: !!user.value, 
        inviteCode 
      });
      showToast('Invalid invitation code', 'error');
      return { success: false, serverId: null, error: 'Invalid invitation code' };
    }
    
    isJoiningServer.value = true;
    console.log("[Invitation Debug] Starting join process with code:", inviteCode);
    
    try {
      // Call the cloud function with just the invite code
      // The server will find the correct server for this invite
      console.log("[Invitation Debug] Calling cloud function with invite code:", inviteCode);
      const result = await joinServerMemberFunction({ inviteCode });
      
      // Extract the result data
      const data = result.data as any;
      console.log("[Invitation Debug] Join result:", data);
      
      if (!data.success) {
        console.error("[Invitation Debug] Join failed");
        showToast('Failed to join server', 'error');
        return { success: false, serverId: null };
      }
      
      // Update the UI
      await loadUserServers();
      console.log("[Invitation Debug] Successfully joined server:", data.serverId);
      
      showToast('Server joined successfully!', 'success');
      return { success: true, serverId: data.serverId };
    } catch (error: any) {
      // Extract the error message
      console.error("[Invitation Debug] Join error:", error);
      
      let errorMessage = 'Failed to join server with invite';
      
      if (error.code === 'not-found') {
        errorMessage = 'Invalid or expired invitation code';
      } else if (error.code === 'already-exists') {
        errorMessage = 'You are already a member of this server';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, 'error');
      return { success: false, serverId: null, error: errorMessage };
    } finally {
      isJoiningServer.value = false;
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
      
      // Reference to the invite document in server's collection
      const serverInviteRef = doc(firestore, 'servers', serverId, 'invites', inviteCode);
      
      // Check if the invite exists in the server's collection
      const serverInviteDoc = await getDoc(serverInviteRef);
      
      if (!serverInviteDoc.exists()) {
        showToast('Invite not found', 'error');
        return false;
      }
      
      // Set the expiration to now to effectively deactivate it
      const updateData = {
        expiresAt: new Date(), // Set to current time to immediately expire
        deactivatedBy: user.value.uid, // Store who deactivated it (metadata field)
        deactivatedAt: new Date()  // Store when it was deactivated (metadata field)
      };
      
      // Update the invite document
      await setDoc(serverInviteRef, updateData, { merge: true });
      
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