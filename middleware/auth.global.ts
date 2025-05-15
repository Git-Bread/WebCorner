export default defineNuxtRouteMiddleware(async (to) => {
  // Skip on server to avoid hydration mismatches
  if (import.meta.server) return
  
  const { isAuthenticated, waitForAuthReady } = useAuth()
  await waitForAuthReady()
  
  const isPublicPage = ['/login', '/register', '/forgot-password', '/'].includes(to.path)

  if (!isPublicPage && !isAuthenticated.value) {
    return navigateTo('/login', { replace: true })
  }
  
  if (isAuthenticated.value) {
    // Forceful refresh since index is too heavy and won't unload properly with navigateTo
    // This is mostly a workaround for the fact that the page is too heavy for SPA navigation and logic
    // Alternative solution would be reducing animations for performance
    if (to.path === '/') {
      window.location.href = '/dashboard'
      return abortNavigation()
    }
    
    if (['/login', '/register'].includes(to.path)) {
      return navigateTo('/dashboard', { replace: true })
    }
  }
})