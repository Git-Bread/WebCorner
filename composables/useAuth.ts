import { type User, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, browserLocalPersistence, setPersistence } from 'firebase/auth'

export const useAuth = () => {
  const { auth } = useFirebase()
  const user = useState<User | null>('user', () => null)
  const isLoading = useState<boolean>('auth-loading', () => true)
  const isAuthenticated = computed(() => !!user.value)
  const authInitialized = useState<boolean>('auth-initialized', () => false)
  
  // Initialize auth state listener only on the client side
  if (import.meta.client) {
    const setupAuthListener = () => {
      // set loading to true at the start
      isLoading.value = true
      
      const unsubscribe = onAuthStateChanged(auth, (newUser) => {
        user.value = newUser
        isLoading.value = false
        authInitialized.value = true
      }, (error) => {
        console.error('Firebase auth error:', error)
        isLoading.value = false
        authInitialized.value = true
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
    // For SSR, immediately set loading to false
    isLoading.value = false
  }

  // Auth operations wrapper, contains action and error handling
  const authAction = async (action: () => Promise<any>) => {
    try {
      isLoading.value = true
      await action()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Authentication error' }
    } finally {
      isLoading.value = false
    }
  }

  const waitForAuthReady = () => {
    // Return immediately if auth is ready
    if (authInitialized.value && !isLoading.value) {
      return Promise.resolve()
    }
    
    // Otherwise wait for auth to be ready
    return new Promise<void>((resolve) => {
      const unwatch = watch([isLoading, authInitialized], ([loading, initialized]) => {
        if (!loading && initialized) {
          unwatch()
          resolve()
        }
      })
    })
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    authInitialized,
    waitForAuthReady,

    // Use the authAction wrapper for each operation
    login: (email: string, password: string) => 
      authAction(() => signInWithEmailAndPassword(auth, email, password)),
    register: (email: string, password: string) => 
      authAction(() => createUserWithEmailAndPassword(auth, email, password)),
    logout: () => authAction(() => signOut(auth))
  }
}