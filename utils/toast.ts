export function showToast(message: string, type = 'info', duration = 3000) {
  // Remove any existing toasts
  const existingToasts = document.querySelectorAll('.toast-notification');
  existingToasts.forEach(toast => {
    document.body.removeChild(toast);
  });
  
  // Map toast types to appropriate background classes
  let bgClass;
  switch(type) {
    case 'success': bgClass = 'bg-success'; break;
    case 'error': bgClass = 'bg-error'; break;
    case 'warning': bgClass = 'bg-warning'; break;
    case 'info': bgClass = 'bg-info'; break;
    default: bgClass = 'bg-info'; // Default to info style
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 py-2 px-4 rounded shadow-lg z-50 animate-fade-in toast-notification toggle-exempt ${bgClass} text-white`;
  toast.innerHTML = message;
  
  // Add to DOM
  document.body.appendChild(toast);
  
  // Remove after duration
  setTimeout(() => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
  }, duration);
}