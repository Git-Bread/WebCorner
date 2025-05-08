import { ref } from 'vue';
import { useFirebase } from '~/composables/useFirebase';
import { useAuth } from '~/composables/useAuth';
import { showToast } from '~/utils/toast';
import { collection, doc, getDoc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';

/**
 * Composable for managing user-specific server layouts
 * Stores layouts in a subcollection under each server document
 */
export function useServerLayouts() {
  const { firestore } = useFirebase();
  const { user } = useAuth();

  // State variables
  const userLayouts = ref<Record<string, any[]>>({});
  const isLoadingLayout = ref(false);
  
  /**
   * Load a user's layout for a specific server
   * If no user-specific layout exists, it falls back to the server default
   */
  const loadUserLayout = async (serverId: string) => {
    if (!user.value || !serverId) return null;
    
    try {
      isLoadingLayout.value = true;
      
      // Reference to the user's layout document in the server's userLayouts subcollection
      const serverDocRef = doc(firestore, 'servers', serverId);
      const userLayoutRef = doc(collection(serverDocRef, 'userLayouts'), user.value.uid);
        
      const userLayoutDoc = await getDoc(userLayoutRef);
      
      if (userLayoutDoc.exists() && userLayoutDoc.data()?.layout) {
        // User has a custom layout for this server
        userLayouts.value[serverId] = userLayoutDoc.data().layout;
        return userLayoutDoc.data().layout;
      } else {
        // No user-specific layout, get server default layout
        const serverDoc = await getDoc(serverDocRef);
        if (serverDoc.exists() && serverDoc.data()?.fieldConfig) {
          userLayouts.value[serverId] = serverDoc.data().fieldConfig;
          return serverDoc.data().fieldConfig;
        }
        // No server default layout either
        return [];
      }
    } catch (error) {
      console.error('Error loading user layout:', error);
      showToast('Failed to load your layout', 'error', 3000);
      return [];
    } finally {
      isLoadingLayout.value = false;
    }
  };
  
  /**
   * Save a user's layout for a specific server
   */
  const saveUserLayout = async (serverId: string, layout: any[]) => {
    if (!user.value || !serverId) return false;
    
    try {
      // Reference to the user's layout document in the server's userLayouts subcollection
      const serverDocRef = doc(firestore, 'servers', serverId);
      const userLayoutRef = doc(collection(serverDocRef, 'userLayouts'), user.value.uid);
      
      // Save the layout with creation/modification metadata
      await setDoc(userLayoutRef, {
        layout,
        userId: user.value.uid,
        lastModified: new Date(),
      }, { merge: true });
      
      // Update local cache
      userLayouts.value[serverId] = layout;
      
      showToast('Layout saved successfully', 'success', 3000);
      return true;
    } catch (error) {
      console.error('Error saving user layout:', error);
      showToast('Failed to save your layout', 'error', 3000);
      return false;
    }
  };
  
  return {
    userLayouts,
    isLoadingLayout,
    loadUserLayout,
    saveUserLayout
  };
}