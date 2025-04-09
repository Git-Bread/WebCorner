import { showToast } from '~/utils/toast'

// Checks user activity and logs them out if they are inactive for 3 days
export default defineNuxtPlugin((nuxtApp) => {
  // Only run this code on the client side
  if (import.meta.server) return
  
  // Store interval reference for cleanup
  let activityCheckInterval: number | null = null
  
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
          
          // Initial inactivity check when page loads
          checkInactivity()
            .then(wasInactive => {
              if (wasInactive) {
                showToast('You have been logged out due to inactivity', 'info', 5000)
              } else if (isAuthenticated.value) {
                // We're active now, update timestamp
                localStorage.setItem('lastActiveTime', Date.now().toString())
              }
            })
            .catch(error => {
              console.error('Error checking inactivity:', error)
            })
          
          // Set up regular interval check (every 4 hours) instead of tracking every event
          const INTERVAL_CHECK = 4 * 60 * 60 * 1000 // 4 hours in milliseconds
          
          // Instead of tracking clicks and scrolls, just periodically update the timestamp 
          // while the user has the page open
          activityCheckInterval = window.setInterval(() => {
            try {
              if (isAuthenticated.value && localStorage.getItem('rememberMe') === 'true') {
                localStorage.setItem('lastActiveTime', Date.now().toString())
              }
            } catch (e) {
              console.error('Error in periodic activity update:', e)
            }
          }, INTERVAL_CHECK)
          
        } catch (e) {
          console.error('Error setting up activity tracking:', e)
        }
      }).catch(error => {
        console.error('Error in auth initialization:', error)
      })
    }, 500) // Increased timeout to ensure everything is ready
  })
  
  // Cleanup function
  const cleanupInterval = () => {
    if (activityCheckInterval !== null) {
      window.clearInterval(activityCheckInterval)
      activityCheckInterval = null
    }
  }
  
  // Properly clean up interval when the plugin is deactivated
  nuxtApp.hook('app:beforeMount', cleanupInterval)
  
  // Return plugin cleanup function
  return {
    provide: {
      cleanupAuthInterval: cleanupInterval
    }
  }
})