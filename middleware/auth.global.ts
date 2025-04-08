export default defineNuxtRouteMiddleware(async (to) => {
    if (import.meta.server) return
    
    const { isAuthenticated, waitForAuthReady } = useAuth()
    await waitForAuthReady()
    
    const isPublicPage = ['/login', '/register', '/'].includes(to.path)
  
    if (!isPublicPage && !isAuthenticated.value) {
      return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
    }
    
    if (isAuthenticated.value && ['/login', '/register'].includes(to.path)) {
      return navigateTo('/')
    }
  })