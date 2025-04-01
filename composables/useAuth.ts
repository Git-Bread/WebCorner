import { type User, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'

export const useAuth = () => {
  const { auth } = useFirebase()
  const user = useState<User | null>('user', () => null)
  const isLoading = useState<boolean>('auth-loading', () => true)
  const isAuthenticated = computed(() => !!user.value)
  
  // Initialize auth state listener only on the client side
  if (import.meta.client) {
    const setupAuthListener = () => {
      const unsubscribe = onAuthStateChanged(auth, (newUser) => {
        user.value = newUser
        isLoading.value = false
      })
      
      // cleanup
      return unsubscribe
    }
    
    // Execute immediately in a client environment
    const unsubscribe = setupAuthListener()
    
    // component context, handle cleanup properly
    if (getCurrentInstance()) {
      onUnmounted(() => unsubscribe())
    }
  } else {
    // For SSR, w immediately set loading to false
    isLoading.value = false
  }

  // Auth operations wrapper, contains action and error handling
  const authAction = async (action: () => Promise<any>) => {
    try {
      await action()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Authentication error' }
    }
  }

  return {
    user,
    isLoading,
    isAuthenticated,

    // Use the authAction wrapper for each operation
    login: (email: string, password: string) => 
      authAction(() => signInWithEmailAndPassword(auth, email, password)),
    register: (email: string, password: string) => 
      authAction(() => createUserWithEmailAndPassword(auth, email, password)),
    logout: () => authAction(() => signOut(auth))
  }
}