export function showToast(message: string, type = 'success', duration = 3000) {
  // Remove any existing toasts
  const existingToasts = document.querySelectorAll('.toast-notification');
  existingToasts.forEach(toast => {
    document.body.removeChild(toast);
  });
  
  // Create toast element, only element excempt from the theme system
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 py-2 px-4 rounded shadow-lg z-50 animate-fade-in toast-notification toggle-exempt bg-${type} text-white`;
  toast.innerHTML = message;
  
  // Add to DOM
  document.body.appendChild(toast);
  
  // Set timeout to remove
  setTimeout(() => {
    if (document.body.contains(toast)) {
      const animationsDisabled = document.documentElement.classList.contains('disable-animations');
      
      if (animationsDisabled) {
        // Remove immediately if animations are disabled
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      } else {
        // Add fade out animation
        toast.classList.add('animate-fade-out');
        
        // Remove after animation completes
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 300); // Duration of fade out animation
      }
    }
  }, duration);
  
  return toast;
}