import { ref, computed } from 'vue';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { showToast } from '~/utils/toast';

/**
 * Interface for server member data
 */
export interface ServerMember {
  userId: string;
  displayName?: string;
  profileImage?: string;
  bio?: string; // Added bio field
  email?: string; // Added email field
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

/**
 * Composable for server member operations
 */
export const useServerMembers = () => {
  const { firestore } = useFirebase();
  
  // State
  const serverMembers = ref<ServerMember[]>([]);
  const isLoadingMembers = ref(false);
  
  // Placeholder profile image path
  const defaultProfileImage = '/images/Profile_Pictures/default_profile.webp';
  
  // Computed properties to group members by role
  const adminAndOwnerMembers = computed(() => {
    return serverMembers.value.filter(member => 
      member.role === 'owner' || member.role === 'admin'
    ).sort((a, b) => {
      // Sort owner first, then admins
      if (a.role === 'owner') return -1;
      if (b.role === 'owner') return 1;
      // If both are admins, sort by join date
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });
  });
  
  const regularMembers = computed(() => {
    return serverMembers.value
      .filter(member => member.role === 'member')
      .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  });
  
  /**
   * Fetch all members for a server
   */
  const fetchServerMembers = async (serverId: string): Promise<void> => {
    if (!serverId) {
      serverMembers.value = [];
      return;
    }
    
    isLoadingMembers.value = true;
    
    try {
      const membersCollection = collection(firestore, 'servers', serverId, 'members');
      const membersSnapshot = await getDocs(membersCollection);
      
      const membersPromises = membersSnapshot.docs.map(async (memberDoc) => {
        const memberData = memberDoc.data();
        const userId = memberData.userId;
        
        // Fetch user profile information
        try {
          const userDoc = await getDoc(doc(firestore, 'users', userId));
          const userData = userDoc.exists() ? userDoc.data() : null;
          
          // Use user's profile image if available, otherwise use default
          // Fixed to use profile_image_url to match schema
          const profileImage = userData?.profile_image_url || defaultProfileImage;
          
          // Prioritize username over email as per user schema
          const displayName = userData?.username || userId;
          
          // Get user bio if available
          const bio = userData?.bio || '';
          
          // Get user email
          const email = userData?.email || '';
          
          return {
            userId,
            role: memberData.role || 'member',
            joinedAt: memberData.joinedAt instanceof Date ? memberData.joinedAt : new Date(memberData.joinedAt),
            displayName,
            profileImage,
            bio,
            email
          } as ServerMember;
        } catch (error) {
          console.error(`Error fetching user data for ${userId}:`, error);
          return {
            userId,
            role: memberData.role || 'member',
            joinedAt: memberData.joinedAt instanceof Date ? memberData.joinedAt : new Date(memberData.joinedAt),
            displayName: userId,
            profileImage: defaultProfileImage
          } as ServerMember;
        }
      });
      
      serverMembers.value = await Promise.all(membersPromises);
    } catch (error) {
      console.error('Error fetching server members:', error);
      showToast('Failed to load server members', 'error');
      serverMembers.value = [];
    } finally {
      isLoadingMembers.value = false;
    }
  };
  
  /**
   * Get display initial for a user (for avatar fallback)
   */
  const getUserInitial = (displayName?: string): string => {
    if (!displayName) return '?';
    return displayName.charAt(0).toUpperCase();
  };

  return {
    // State
    serverMembers,
    isLoadingMembers,
    
    // Computed
    adminAndOwnerMembers,
    regularMembers,
    
    // Methods
    fetchServerMembers,
    getUserInitial
  };
};