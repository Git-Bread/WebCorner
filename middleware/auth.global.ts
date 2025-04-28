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
    // forcefull refresh since index is too heavy and wont unload properly with navigateTo
    // this is mostly a workaround for the fact that the page is to heavy for spa navigation and logic
    // could be solved by killing a few animations or similar, but i dont wanna.
    if (to.path === '/') {
      window.location.href = '/dashboard'
      return abortNavigation()
    }
    
    if (['/login', '/register'].includes(to.path)) {
      return navigateTo('/dashboard', { replace: true })
    }
  }
})