import { 
  type User, 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  browserLocalPersistence, 
  browserSessionPersistence,
  setPersistence,
  sendEmailVerification,
  reload
} from 'firebase/auth'
import { resetAppState } from '~/utils/resetState'

export const useAuth = () => {
  const { auth } = useFirebase()
  const user = useState<User | null>('user', () => null)
  const isLoading = useState<boolean>('auth-loading', () => true)
  const isAuthenticated = computed(() => !!user.value)
  const authInitialized = useState<boolean>('auth-initialized', () => false)
  const previousUserId = useState<string | null>('previous-user-id', () => null)
  
  // Inactivity timeout (3 days in milliseconds)
  const INACTIVITY_TIMEOUT = 3 * 24 * 60 * 60 * 1000

  // Helper to clear caches on auth state changes
  const clearCachesOnAuthChange = () => {
    resetAppState(previousUserId.value || undefined)
  }
  
  // Initialize auth state listener only on the client side
  if (import.meta.client) {
    const setupAuthListener = () => {
      // set loading to true at the start
      isLoading.value = true
      
      const unsubscribe = onAuthStateChanged(auth, (newUser) => {
        // Save the previous user ID before updating
        if (user.value && user.value.uid !== newUser?.uid) {
          previousUserId.value = user.value.uid
        }
        
        // Record if this is a user change or logout
        const isUserChange = user.value?.uid !== newUser?.uid && user.value !== null && newUser !== null
        const isLogout = user.value !== null && newUser === null
        
        // Update user state
        user.value = newUser
        
        // Clear caches on user change or logout
        if (isUserChange || isLogout) {
          clearCachesOnAuthChange()
        }
        
        // If user logged in and "Remember Me" was checked, update last activity timestamp
        if (newUser && localStorage.getItem('rememberMe') === 'true') {
          localStorage.setItem('lastActiveTime', Date.now().toString())
        }
        
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

  // Internal helper for direct signOut (used by checkInactivity)
  const performSignOut = async () => {
    try {
      // Clear caches before signing out
      clearCachesOnAuthChange()
      
      await signOut(auth)
      localStorage.removeItem('lastActiveTime')
      localStorage.removeItem('rememberMe')
      return true
    } catch (error) {
      console.error('Error during sign out:', error)
      return false
    }
  }

  // Check if user has been inactive for too long
  const checkInactivity = async () => {
    if (import.meta.client && localStorage.getItem('rememberMe') === 'true') {
      const lastActiveTime = localStorage.getItem('lastActiveTime')
      
      if (lastActiveTime) {
        const now = Date.now()
        const lastActive = parseInt(lastActiveTime)
        
        // If more than INACTIVITY_TIMEOUT has passed, log out
        if (now - lastActive > INACTIVITY_TIMEOUT) {
          return await performSignOut() // Return true if logout succeeded
        }
      }
    }
    return false // User was not inactive or not logged out
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
    checkInactivity,

    // Use the authAction wrapper for each operation
    login: (email: string, password: string, rememberMe: boolean = false) => 
      authAction(async () => {
        // Clear caches before login
        clearCachesOnAuthChange()
        
        // Set persistence based on "Remember Me" checkbox
        const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence
        await setPersistence(auth, persistenceType)
        
        // Sign in the user
        await signInWithEmailAndPassword(auth, email, password)
        
        // If "Remember Me" is checked, store the preference and timestamp
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true')
          localStorage.setItem('lastActiveTime', Date.now().toString())
        } else {
          localStorage.removeItem('rememberMe')
          localStorage.removeItem('lastActiveTime')
        }
      }),
      
    register: (email: string, password: string) => authAction(async () => {
      // Clear caches before registration
      clearCachesOnAuthChange()
      
      // Create the user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      // Send verification email
      if (userCredential.user) {
        await sendEmailVerification(userCredential.user)
      }
      
      return userCredential
    }),
    
    logout: () => authAction(async () => {
      // Clear caches before logout
      clearCachesOnAuthChange()
      
      await signOut(auth)
      localStorage.removeItem('lastActiveTime')
      localStorage.removeItem('rememberMe')
    }),
    
    // New methods for email verification
    sendVerificationEmail: () => authAction(async () => {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser)
      } else {
        throw new Error('No user is currently signed in')
      }
    }),
    
    refreshUserProfile: () => authAction(async () => {
      if (auth.currentUser) {
        await reload(auth.currentUser)
        return auth.currentUser
      }
      throw new Error('No user is currently signed in')
    }),
    
    isEmailVerified: computed(() => {
      return user.value?.emailVerified || false
    })
  }
}