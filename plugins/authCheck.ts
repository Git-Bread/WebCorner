import { showToast } from '~/utils/toast'

// Checks user activity and logs them out if they are inactive for 3 days
export default defineNuxtPlugin((nuxtApp) => {
  // Only run this code on the client side
  if (import.meta.server) return
  
  // Store event listener references for cleanup
  let throttledUpdateActivity: (() => void) | null = null
  let handleScroll: (() => void) | null = null
  let scrollTimeout: number | null = null
  
  // Wait for the application to be mounted before initializing
  nuxtApp.hook('app:mounted', () => {
    // Defer execution to ensure auth is ready
    setTimeout(() => {
      const { checkInactivity, isAuthenticated, waitForAuthReady } = useAuth()
      
      // Initialize after auth is ready
      waitForAuthReady().then(() => {
        try {
          // Only proceed if "Remember Me" was checked
          if (!window.localStorage || localStorage.getItem('rememberMe') !== 'true') {
            return
          }
          
          checkInactivity()
            .then(wasInactive => {
              if (wasInactive) {
                showToast('You have been logged out due to inactivity', 'info', 5000)
              } else if (isAuthenticated.value) {
                // Update the last active timestamp for authenticated users
                localStorage.setItem('lastActiveTime', Date.now().toString())
              }
            })
            .catch(error => {
              console.error('Error checking inactivity:', error)
            })
          
          // Throttle function
          let lastUpdateTime = Date.now()
          const THROTTLE_DELAY = 15 * 60 * 1000 // 15 minutes
          
          throttledUpdateActivity = () => {
            try {
              if (isAuthenticated.value && localStorage.getItem('rememberMe') === 'true') {
                const now = Date.now()
                if (now - lastUpdateTime > THROTTLE_DELAY) {
                  localStorage.setItem('lastActiveTime', now.toString())
                  lastUpdateTime = now
                }
              }
            } catch (e) {
              console.error('Error in throttledUpdateActivity:', e)
            }
          }
          
          // Add event listeners
          window.addEventListener('click', throttledUpdateActivity)
          window.addEventListener('keypress', throttledUpdateActivity)
          
          // Scroll event with debounce
          handleScroll = () => {
            if (scrollTimeout) {
              clearTimeout(scrollTimeout)
            }
            
            scrollTimeout = window.setTimeout(() => {
              if (throttledUpdateActivity) throttledUpdateActivity()
              scrollTimeout = null
            }, 1000)
          }
          
          window.addEventListener('scroll', handleScroll, { passive: true })
        } catch (e) {
          console.error('Error setting up activity tracking:', e)
        }
      }).catch(error => {
        console.error('Error in auth initialization:', error)
      })
    }, 500) // Increased timeout to ensure everything is ready
  })
  
  // Properly clean up event listeners when the plugin is deactivated
  nuxtApp.hook('app:beforeMount', () => {
    cleanupListeners()
  })
  
  // Function to clean up all event listeners
  const cleanupListeners = () => {
    if (throttledUpdateActivity) {
      window.removeEventListener('click', throttledUpdateActivity)
      window.removeEventListener('keypress', throttledUpdateActivity)
    }
    
    if (handleScroll) {
      window.removeEventListener('scroll', handleScroll)
    }
    
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
      scrollTimeout = null
    }
  }
  
  // Return plugin cleanup function
  return {
    provide: {
      cleanupAuthListeners: cleanupListeners
    }
  }
})