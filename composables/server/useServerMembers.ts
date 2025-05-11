import { ref, computed } from 'vue';
import { collection, getDocs, doc, getDoc} from 'firebase/firestore';
import { showToast } from '~/utils/toast';
import { shouldLog } from '~/utils/debugUtils';
import { setCacheItem, getCacheItem, removeCacheItem } from '~/utils/storageUtils/cacheUtil';
import type { ServerRole } from './useServerPermissions';

/**
 * Interface for server member data
 */
export interface ServerMember {
  userId: string;
  displayName: string;
  profileImage: string;
  bio?: string;
  email?: string;
  role: ServerRole;
  joinedAt: Date;
  lastActive?: Date;
}

/**
 * Basic member info with minimal fields
 */
export interface BasicMemberInfo {
  userId: string;
  displayName: string;
  role: ServerRole;
}

// Subsystem name for logging
const SUBSYSTEM = 'members';

// Cache key prefixes
const MEMBERS_CACHE_PREFIX = 'server_members';
const MEMBER_DETAILS_PREFIX = 'member_details';

// Cache expiration times in milliseconds
const MEMBERS_CACHE_EXPIRATION = 5 * 60 * 1000; // 5 minutes for member lists
const MEMBER_DETAILS_EXPIRATION = 30 * 60 * 1000; // 30 minutes for individual member details

// Default assets
const DEFAULT_PROFILE_IMAGE = '/images/Profile_Pictures/default_profile.webp';

/**
 * Server members manager composable
 */
export const useServerMembers = () => {
  const { firestore } = useFirebase();
  
  // State
  const serverMembers = ref<ServerMember[]>([]);
  const isLoadingMembers = ref(false);
  
  // PRIVATE METHODS
  
  /**
   * Logs debug information
   */
  const logDebug = (message: string, ...data: any[]): void => {
    if (shouldLog(SUBSYSTEM)) {
      console.log(`[Members] ${message}`, ...data);
    }
  };
  
  /**
   * Logs an error and returns a fallback value
   */
  const logError = <T>(context: string, error: unknown, fallback: T): T => {
    if (shouldLog(SUBSYSTEM)) {
      console.error(`[Members] ${context}:`, error);
    }
    return fallback;
  };
  
  /**
   * Generate cache key for server members list
   */
  const getMembersCacheKey = (serverId: string): string => {
    return `${MEMBERS_CACHE_PREFIX}_${serverId}`;
  };
  
  /**
   * Generate cache key for individual member details
   */
  const getMemberDetailsCacheKey = (serverId: string, userId: string): string => {
    return `${MEMBER_DETAILS_PREFIX}_${serverId}_${userId}`;
  };
  
  /**
   * Format member data from Firestore
   */
  const formatMemberData = (memberData: any, userData: any | null, userId: string): ServerMember => {
    // Use user's profile image if available, otherwise use default
    const profileImage = userData?.profile_image_url || DEFAULT_PROFILE_IMAGE;
    
    // Prioritize username over email as per user schema
    const displayName = userData?.username || userId;
    
    // Get user bio if available
    const bio = userData?.bio || '';
    
    // Get user email
    const email = userData?.email || '';
    
    // Parse the join date
    const joinedAt = memberData.joinedAt instanceof Date 
      ? memberData.joinedAt 
      : new Date(memberData.joinedAt);
      
    // Parse last active date if available
    const lastActive = memberData.lastActive 
      ? (memberData.lastActive instanceof Date 
          ? memberData.lastActive 
          : new Date(memberData.lastActive))
      : undefined;
    
    return {
      userId,
      role: memberData.role || 'member',
      joinedAt,
      lastActive,
      displayName,
      profileImage,
      bio,
      email
    };
  };
  
  /**
   * Fetch user profile data for a member
   */
  const fetchUserProfileData = async (userId: string): Promise<any | null> => {
    try {
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
      logError(`fetchUserProfileData(${userId})`, error, null);
      return null;
    }
  };
  
  // PUBLIC API
  
  /**
   * Clear server members cache
   */
  const clearCache = (serverId?: string): void => {
    if (serverId) {
      // Clear members list cache
      const membersCacheKey = getMembersCacheKey(serverId);
      removeCacheItem(membersCacheKey, true);
      logDebug(`Cleared members cache for server: ${serverId}`);
      
      // We cannot easily clear all member details cache entries
      // without knowing all user IDs
    } else {
      logDebug('Note: Full cache clear not implemented - need to specify server ID');
    }
  };
  
  /**
   * Fetch all members for a server
   */
  const fetchServerMembers = async (serverId: string, forceFresh = false): Promise<ServerMember[]> => {
    if (!serverId) {
      serverMembers.value = [];
      return [];
    }
    
    logDebug(`Fetching members for server: ${serverId}`);
    isLoadingMembers.value = true;
    
    try {
      // Check cache first unless force fresh is specified
      if (!forceFresh) {
        const cacheKey = getMembersCacheKey(serverId);
        const cachedMembers = getCacheItem<ServerMember[]>(cacheKey);
        
        if (cachedMembers) {
          logDebug(`Using cached members list with ${cachedMembers.length} members`);
          serverMembers.value = cachedMembers;
          return cachedMembers;
        }
      }
      
      const membersCollection = collection(firestore, 'servers', serverId, 'members');
      const membersSnapshot = await getDocs(membersCollection);
      
      logDebug(`Retrieved ${membersSnapshot.docs.length} members from Firestore`);
      
      const membersPromises = membersSnapshot.docs.map(async (memberDoc) => {
        const memberData = memberDoc.data();
        const userId = memberData.userId;
        
        // Check if we have cached member details
        const memberDetailsCacheKey = getMemberDetailsCacheKey(serverId, userId);
        const cachedMemberDetails = getCacheItem<ServerMember>(memberDetailsCacheKey);
        
        if (cachedMemberDetails) {
          logDebug(`Using cached details for member: ${userId}`);
          return cachedMemberDetails;
        }
        
        // Fetch user profile information
        const userData = await fetchUserProfileData(userId);
        const memberInfo = formatMemberData(memberData, userData, userId);
        
        // Cache individual member details
        setCacheItem(memberDetailsCacheKey, memberInfo, MEMBER_DETAILS_EXPIRATION, true);
        
        return memberInfo;
      });
      
      const membersList = await Promise.all(membersPromises);
      
      // Cache the complete members list
      const membersCacheKey = getMembersCacheKey(serverId);
      setCacheItem(membersCacheKey, membersList, MEMBERS_CACHE_EXPIRATION, true);
      
      // Update state
      serverMembers.value = membersList;
      return membersList;
    } catch (error) {
      logError(`fetchServerMembers(${serverId})`, error, []);
      showToast('Failed to load server members', 'error');
      serverMembers.value = [];
      return [];
    } finally {
      isLoadingMembers.value = false;
    }
  };
  
  /**
   * Fetch a specific member's details
   */
  const fetchMemberDetails = async (serverId: string, userId: string, forceFresh = false): Promise<ServerMember | null> => {
    if (!serverId || !userId) return null;
    
    try {
      logDebug(`Fetching details for member: ${userId} in server: ${serverId}`);
      
      // Check cache first unless force fresh is specified
      if (!forceFresh) {
        const cacheKey = getMemberDetailsCacheKey(serverId, userId);
        const cachedMember = getCacheItem<ServerMember>(cacheKey);
        
        if (cachedMember) {
          logDebug(`Using cached details for member: ${userId}`);
          return cachedMember;
        }
      }
      
      // Fetch member data
      const memberDoc = await getDoc(doc(firestore, 'servers', serverId, 'members', userId));
      
      if (!memberDoc.exists()) {
        logDebug(`Member not found: ${userId}`);
        return null;
      }
      
      const memberData = memberDoc.data();
      
      // Fetch user profile data
      const userData = await fetchUserProfileData(userId);
      const memberInfo = formatMemberData(memberData, userData, userId);
      
      // Cache member details
      const cacheKey = getMemberDetailsCacheKey(serverId, userId);
      setCacheItem(cacheKey, memberInfo, MEMBER_DETAILS_EXPIRATION, true);
      
      return memberInfo;
    } catch (error) {
      return logError(`fetchMemberDetails(${serverId}, ${userId})`, error, null);
    }
  };
  
  /**
   * Get basic member info (minimal fields) for a list of user IDs
   */
  const getBasicMemberInfo = async (serverId: string, userIds: string[]): Promise<BasicMemberInfo[]> => {
    if (!serverId || !userIds.length) return [];
    
    try {
      logDebug(`Fetching basic info for ${userIds.length} members`);
      
      const results: BasicMemberInfo[] = [];
      
      // Process in smaller batches to avoid too many concurrent requests
      const batchSize = 10;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (userId) => {
          // Check cache first
          const cacheKey = getMemberDetailsCacheKey(serverId, userId);
          const cachedMember = getCacheItem<ServerMember>(cacheKey);
          
          if (cachedMember) {
            return {
              userId: cachedMember.userId,
              displayName: cachedMember.displayName,
              role: cachedMember.role
            };
          }
          
          // Fetch minimal data if not in cache
          const memberDoc = await getDoc(doc(firestore, 'servers', serverId, 'members', userId));
          
          if (!memberDoc.exists()) return null;
          
          const memberData = memberDoc.data();
          
          // Get minimal user data
          const userDoc = await getDoc(doc(firestore, 'users', userId));
          const displayName = userDoc.exists() 
            ? userDoc.data().username || userId 
            : userId;
          
          return {
            userId,
            displayName,
            role: memberData.role || 'member'
          };
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(Boolean) as BasicMemberInfo[]);
      }
      
      return results;
    } catch (error) {
      return logError(`getBasicMemberInfo(${serverId}, ${userIds.length} users)`, error, []);
    }
  };
  
  /**
   * Get display initial for a user (for avatar fallback)
   */
  const getUserInitial = (displayName?: string): string => {
    if (!displayName) return '?';
    return displayName.charAt(0).toUpperCase();
  };
  
  /**
   * Find a member by user ID in the current list
   */
  const findMemberById = (userId: string): ServerMember | undefined => {
    return serverMembers.value.find(member => member.userId === userId);
  };
  
  // COMPUTED PROPERTIES
  
  // Members with admin or owner roles
  const adminAndOwnerMembers = computed(() => {
    return serverMembers.value
      .filter(member => member.role === 'owner' || member.role === 'admin')
      .sort((a, b) => {
        // Sort owner first, then admins
        if (a.role === 'owner') return -1;
        if (b.role === 'owner') return 1;
        // If both are admins, sort by join date
        return a.joinedAt.getTime() - b.joinedAt.getTime();
      });
  });
  
  // Group managers
  const groupManagerMembers = computed(() => {
    return serverMembers.value
      .filter(member => member.role === 'group_manager')
      .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  });
  
  // Regular members
  const regularMembers = computed(() => {
    return serverMembers.value
      .filter(member => member.role === 'member')
      .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  });
  
  // Recently joined members (last 7 days)
  const recentlyJoinedMembers = computed(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return serverMembers.value
      .filter(member => member.joinedAt > oneWeekAgo)
      .sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime()); // Newest first
  });

  return {
    // State
    serverMembers,
    isLoadingMembers,
    
    // Computed
    adminAndOwnerMembers,
    groupManagerMembers,
    regularMembers,
    recentlyJoinedMembers,
    
    // Methods
    fetchServerMembers,
    fetchMemberDetails,
    getBasicMemberInfo,
    getUserInitial,
    findMemberById,
    clearCache
  };
};