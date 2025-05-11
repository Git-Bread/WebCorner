import { doc, getDoc } from 'firebase/firestore';
import { shouldLog } from '~/utils/debugUtils';
import { setCacheItem, getCacheItem, removeCacheItem } from '~/utils/storageUtils/cacheUtil';

/**
 * Types of server roles
 */
export type ServerRole = 'owner' | 'admin' | 'group_manager' | 'member' | string;

/**
 * Critical actions requiring real-time permission verification
 */
export type CriticalAction = 
  | 'manageRoles'   // Role management
  | 'deleteServer'  // Server deletion
  | 'removeUser'    // User removal
  | 'editServer'    // Server configuration
  | 'manageAdmin'   // Admin assignments
  | string;         // Allow for extension

/**
 * Permission capabilities interface
 */
export interface PermissionCapability {
  canInviteMembers: boolean;
  canManageInvites: boolean;
  canRemoveMembers: boolean;
  canEditServer: boolean;
  canManageChannels: boolean;
  canManageRoles: boolean;
  canDeleteServer: boolean;
  canManageFiles: boolean;
  canModerateGroups: boolean;   // Can moderate any group
  canManageOwnGroup: boolean;   // Can only manage groups they're assigned to
  [key: string]: boolean;       // Future permissions
}

/**
 * Group management info
 */
export interface GroupInfo {
  groupId: string;
  name: string;
  managerId?: string;
}

/**
 * Role-based permission defaults
 */
const DEFAULT_PERMISSIONS: Record<ServerRole, PermissionCapability> = {
  'owner': {
    canInviteMembers: true,
    canManageInvites: true,
    canRemoveMembers: true,
    canEditServer: true,
    canManageChannels: true,
    canManageRoles: true,
    canDeleteServer: true,
    canManageFiles: true,
    canModerateGroups: true,
    canManageOwnGroup: true
  },
  'admin': {
    canInviteMembers: true,
    canManageInvites: true,
    canRemoveMembers: true,
    canEditServer: true,
    canManageChannels: true,
    canManageRoles: false,
    canDeleteServer: false,
    canManageFiles: true,
    canModerateGroups: true,
    canManageOwnGroup: true
  },
  'group_manager': {
    canInviteMembers: true,
    canManageInvites: true,
    canRemoveMembers: false,
    canEditServer: false,
    canManageChannels: false,
    canManageRoles: false,
    canDeleteServer: false,
    canManageFiles: true,
    canModerateGroups: false,
    canManageOwnGroup: true
  },
  'member': {
    canInviteMembers: true,
    canManageInvites: false,
    canRemoveMembers: false,
    canEditServer: false,
    canManageChannels: false,
    canManageRoles: false,
    canDeleteServer: false,
    canManageFiles: false,
    canModerateGroups: false,
    canManageOwnGroup: false
  }
};

/**
 * Map critical actions to required permissions
 */
const CRITICAL_ACTION_MAP: Record<CriticalAction, keyof PermissionCapability> = {
  'manageRoles': 'canManageRoles',
  'deleteServer': 'canDeleteServer',
  'removeUser': 'canRemoveMembers',
  'editServer': 'canEditServer',
  'manageAdmin': 'canManageRoles'
};

/**
 * Role hierarchy from highest to lowest
 */
const ROLE_HIERARCHY: ServerRole[] = ['owner', 'admin', 'group_manager', 'member'];

// Cache expiration time in milliseconds
const CACHE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

// Cache key prefixes
const ROLE_CACHE_PREFIX = 'permissions_role';
const CUSTOM_PERMISSIONS_PREFIX = 'permissions_custom';

// Subsystem name for logging
const SUBSYSTEM = 'permissions';

/**
 * Permission manager composable
 */
export const useServerPermissions = () => {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  
  // PRIVATE METHODS
  
  /**
   * Logs an error and returns a fallback value
   */
  const logError = <T>(context: string, error: unknown, fallback: T): T => {
    if (shouldLog(SUBSYSTEM)) {
      console.error(`[Permissions] ${context}:`, error);
    }
    return fallback;
  };
  
  /**
   * Logs debug information
   */
  const logDebug = (message: string, ...data: any[]): void => {
    if (shouldLog(SUBSYSTEM)) {
      console.log(`[Permissions] ${message}`, ...data);
    }
  };
  
  /**
   * Generate cache key for role
   */
  const getRoleCacheKey = (userId: string, serverId: string): string => {
    return `${ROLE_CACHE_PREFIX}_${userId}_${serverId}`;
  };
  
  /**
   * Generate cache key for custom permissions
   */
  const getCustomPermissionsCacheKey = (serverId: string, role: string): string => {
    return `${CUSTOM_PERMISSIONS_PREFIX}_${serverId}_${role}`;
  };
  
  /**
   * Retrieves user's role from Firestore
   */
  const fetchRoleFromFirestore = async (serverId: string): Promise<ServerRole | null> => {
    if (!user.value || !serverId) return null;
    
    try {
      logDebug(`Fetching role from Firestore for server: ${serverId}`);
      
      // Check server document for ownership
      const serverDoc = await getDoc(doc(firestore, 'servers', serverId));
      if (!serverDoc.exists()) return null;
      
      // If user is owner, return owner role
      if (serverDoc.data().ownerId === user.value.uid) {
        logDebug('User is server owner');
        
        // Cache the role
        const cacheKey = getRoleCacheKey(user.value.uid, serverId);
        setCacheItem(cacheKey, 'owner', CACHE_EXPIRATION_MS, true);
        
        return 'owner';
      }
      
      // Otherwise check member document for role
      const memberDoc = await getDoc(doc(firestore, 'servers', serverId, 'members', user.value.uid));
      if (!memberDoc.exists()) return null;
      
      const role = memberDoc.data().role || 'member';
      logDebug(`User has role: ${role}`);
      
      // Cache the role
      const cacheKey = getRoleCacheKey(user.value.uid, serverId);
      setCacheItem(cacheKey, role, CACHE_EXPIRATION_MS, true);
      
      return role;
    } catch (error) {
      return logError('fetchRoleFromFirestore', error, null);
    }
  };
  
  /**
   * Gets custom permissions for a role if defined, otherwise returns defaults
   */
  const getPermissionsForRole = async (
    serverId: string, 
    role: ServerRole
  ): Promise<PermissionCapability> => {
    if (!serverId || !role) return DEFAULT_PERMISSIONS.member;
    
    try {
      logDebug(`Getting permissions for role: ${role}`);
      
      // Check cache first
      const cacheKey = getCustomPermissionsCacheKey(serverId, role);
      const cachedPermissions = getCacheItem<PermissionCapability>(cacheKey);
      
      if (cachedPermissions) {
        logDebug('Using cached custom permissions');
        return cachedPermissions;
      }
      
      // Try to get custom server role definitions
      const serverRolesDoc = await getDoc(doc(firestore, 'servers', serverId, 'settings', 'roles'));
      
      // If this server has custom role permissions, use those
      if (serverRolesDoc.exists() && serverRolesDoc.data().roles?.[role]) {
        logDebug('Using custom role permissions from server');
        const customPermissions = serverRolesDoc.data().roles[role] as PermissionCapability;
        
        // Cache the custom permissions
        setCacheItem(cacheKey, customPermissions, CACHE_EXPIRATION_MS, true);
        
        return customPermissions;
      }
      
      // Otherwise, use the default permissions for this role
      logDebug('Using default role permissions');
      return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.member;
    } catch (error) {
      logError('getPermissionsForRole', error, null);
      // Fall back to default permissions on error
      return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.member;
    }
  };
  
  // PUBLIC API
  
  /**
   * Clears the permission cache for improved security
   */
  const clearCache = (serverId?: string, userId?: string): void => {
    userId = userId || user.value?.uid;
    if (!userId) return;
    
    if (serverId) {
      // Clear specific server role cache
      const roleCacheKey = getRoleCacheKey(userId, serverId);
      removeCacheItem(roleCacheKey, true);
      logDebug(`Cache cleared for server: ${serverId}`);
      
      // Clear any custom permissions for this server
      for (const role of Object.keys(DEFAULT_PERMISSIONS)) {
        const permissionsCacheKey = getCustomPermissionsCacheKey(serverId, role);
        removeCacheItem(permissionsCacheKey, true);
      }
    } else {
      // Cannot clear everything easily - would need to know all servers
      // Just log a warning for now
      logDebug('Note: Full cache clear not implemented - need to specify server ID');
    }
  };
  
  /**
   * Gets the user's role for a server
   * @param forceFresh If true, bypasses cache for real-time verification
   */
  const getUserRole = async (
    serverId: string, 
    forceFresh = false
  ): Promise<ServerRole | null> => {
    if (!user.value || !serverId) return null;
    
    // Check cache unless force fresh is enabled
    if (!forceFresh) {
      const cacheKey = getRoleCacheKey(user.value.uid, serverId);
      const cachedRole = getCacheItem<ServerRole>(cacheKey);
      
      if (cachedRole) {
        logDebug(`Using cached role: ${cachedRole}`);
        return cachedRole;
      }
    } else {
      logDebug('Bypassing cache for real-time role verification');
    }
    
    return fetchRoleFromFirestore(serverId);
  };
  
  /**
   * Checks if user has the specified role or higher
   */
  const hasRoleOrHigher = async (
    serverId: string, 
    minimumRole: ServerRole, 
    forceFresh = false
  ): Promise<boolean> => {
    const userRole = await getUserRole(serverId, forceFresh);
    if (!userRole) return false;
    
    const userRoleIndex = ROLE_HIERARCHY.indexOf(userRole);
    const minimumRoleIndex = ROLE_HIERARCHY.indexOf(minimumRole);
    
    const hasRequiredRole = userRoleIndex !== -1 && minimumRoleIndex !== -1 && userRoleIndex <= minimumRoleIndex;
    logDebug(`Role check - User: ${userRole}, Required: ${minimumRole}, Result: ${hasRequiredRole}`);
    
    return hasRequiredRole;
  };
  
  /**
   * Checks if user has a specific permission
   */
  const hasPermission = async (
    serverId: string, 
    permission: keyof PermissionCapability,
    forceFresh = false
  ): Promise<boolean> => {
    const userRole = await getUserRole(serverId, forceFresh);
    if (!userRole) return false;
    
    const permissions = await getPermissionsForRole(serverId, userRole);
    const hasPermissionResult = !!permissions[permission];
    
    logDebug(`Permission check - ${permission}: ${hasPermissionResult}`);
    return hasPermissionResult;
  };
  
  /**
   * Checks permission for critical actions with forced real-time verification
   */
  const checkCriticalAction = async (
    serverId: string,
    action: CriticalAction
  ): Promise<boolean> => {
    const requiredPermission = CRITICAL_ACTION_MAP[action];
    if (!requiredPermission) {
      logDebug(`Unknown critical action: ${action}`);
      return false;
    }
    
    logDebug(`Critical action check: ${action} -> ${requiredPermission}`);
    // Critical actions always force real-time permission checks
    return hasPermission(serverId, requiredPermission, true);
  };
  
  /**
   * Gets groups the user can manage
   */
  const getManagedGroups = async (serverId: string): Promise<GroupInfo[]> => {
    if (!user.value || !serverId) return [];
    
    try {
      // Check if user has general moderation permission first
      const canModerateGroups = await hasPermission(serverId, 'canModerateGroups');
      
      // If user can moderate all groups, fetch all groups
      if (canModerateGroups) {
        logDebug('User can moderate all groups');
        const groupsCollection = await getDoc(doc(firestore, 'servers', serverId, 'settings', 'groups'));
        if (!groupsCollection.exists()) return [];
        
        return (groupsCollection.data().groups || []) as GroupInfo[];
      }
      
      // Otherwise, check if user is a group manager and can manage their own group
      const canManageOwnGroup = await hasPermission(serverId, 'canManageOwnGroup');
      if (!canManageOwnGroup) {
        logDebug('User cannot manage any groups');
        return [];
      }
      
      // Get group assignments for this user
      const userGroupsDoc = await getDoc(doc(firestore, 'servers', serverId, 'members', user.value.uid));
      if (!userGroupsDoc.exists()) return [];
      
      const userData = userGroupsDoc.data();
      const assignedGroupIds = userData.managedGroups || [];
      
      if (assignedGroupIds.length === 0) {
        logDebug('User has no assigned groups to manage');
        return [];
      }
      
      logDebug(`User is assigned to manage ${assignedGroupIds.length} groups`);
      
      // Fetch the group details for assigned groups
      const groupsCollection = await getDoc(doc(firestore, 'servers', serverId, 'settings', 'groups'));
      if (!groupsCollection.exists()) return [];
      
      const allGroups = (groupsCollection.data().groups || []) as GroupInfo[];
      const managedGroups = allGroups.filter(group => assignedGroupIds.includes(group.groupId));
      
      logDebug(`Found ${managedGroups.length} managed groups`);
      return managedGroups;
    } catch (error) {
      return logError('getManagedGroups', error, []);
    }
  };
  
  /**
   * Checks if user can manage a specific group
   */
  const canManageGroup = async (serverId: string, groupId: string): Promise<boolean> => {
    if (!user.value || !serverId || !groupId) return false;
    
    try {
      const canModerateGroups = await hasPermission(serverId, 'canModerateGroups');
      if (canModerateGroups) {
        logDebug('User can moderate all groups');
        return true;
      }
      
      const canManageOwnGroup = await hasPermission(serverId, 'canManageOwnGroup');
      if (!canManageOwnGroup) {
        logDebug('User cannot manage any groups');
        return false;
      }
      
      const userGroupsDoc = await getDoc(doc(firestore, 'servers', serverId, 'members', user.value.uid));
      if (!userGroupsDoc.exists()) return false;
      
      const userData = userGroupsDoc.data();
      const assignedGroupIds = userData.managedGroups || [];
      
      const canManage = assignedGroupIds.includes(groupId);
      logDebug(`Group ${groupId} management check: ${canManage}`);
      
      return canManage;
    } catch (error) {
      return logError('canManageGroup', error, false);
    }
  };
  
  return {
    // Core permission API
    getUserRole,
    hasRoleOrHigher,
    hasPermission,
    checkCriticalAction,
    
    // Group management
    getManagedGroups,
    canManageGroup,
    
    // Cache management
    clearCache,
    
    // Constants
    ROLE_HIERARCHY,
    CRITICAL_ACTIONS: CRITICAL_ACTION_MAP
  };
};