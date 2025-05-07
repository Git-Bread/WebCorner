import { doc, getDoc } from 'firebase/firestore';

/**
 * Composable for server permission operations and checks
 */
export const useServerPermissions = () => {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  
  /**
   * Check if the current user is an owner or admin of the server
   */
  const isServerAdminOrOwner = async (serverId: string): Promise<boolean> => {
    if (!user.value || !serverId) return false;
    
    try {
      // Check if server exists and user is owner
      const serverDoc = await getDoc(doc(firestore, 'servers', serverId));
      if (!serverDoc.exists()) return false;
      
      // If user is the owner, return true immediately
      if (serverDoc.data().ownerId === user.value.uid) return true;
      
      // Otherwise check if user is an admin
      const memberDoc = await getDoc(doc(firestore, 'servers', serverId, 'members', user.value.uid));
      if (!memberDoc.exists()) return false;
      
      return memberDoc.data().role === 'admin';
    } catch (error) {
      console.error('Error checking server privileges:', error);
      return false;
    }
  };
  
  /**
   * Check if the current user is the owner of the server
   */
  const isServerOwner = async (serverId: string): Promise<boolean> => {
    if (!user.value || !serverId) return false;
    
    try {
      const serverDoc = await getDoc(doc(firestore, 'servers', serverId));
      if (!serverDoc.exists()) return false;
      
      return serverDoc.data().ownerId === user.value.uid;
    } catch (error) {
      console.error('Error checking server ownership:', error);
      return false;
    }
  };
  
  /**
   * Check if the current user is a member of the server
   */
  const isServerMember = async (serverId: string): Promise<boolean> => {
    if (!user.value || !serverId) return false;
    
    try {
      // Check if user is owner
      const isOwner = await isServerOwner(serverId);
      if (isOwner) return true;
      
      // Check if user is in members collection
      const memberDoc = await getDoc(doc(firestore, 'servers', serverId, 'members', user.value.uid));
      return memberDoc.exists();
    } catch (error) {
      console.error('Error checking server membership:', error);
      return false;
    }
  };
  
  return {
    isServerAdminOrOwner,
    isServerOwner,
    isServerMember
  };
};