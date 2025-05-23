// Common utilities for settings components

// Toggle classes for UI
export const getToggleTrackClasses = (isActive: boolean) => {
  return [
    'relative', 'inline-flex', 'items-center', 'h-6', 'rounded-full', 'w-11', 
    'transition-colors', 'duration-200', 'ease-in-out', 
    isActive ? 'bg-theme-primary' : 'bg-border dark:bg-gray-600'
  ];
};

export const getToggleThumbClasses = (isActive: boolean) => {
  return [
    'inline-block', 'w-4', 'h-4', 'transform', 'rounded-full', 'bg-background', 'shadow', 
    'transition-transform', 'duration-200', 'ease-in-out',
    isActive ? 'translate-x-6' : 'translate-x-1'
  ];
};

// Apply theme settings to the document
export const applyTheme = (theme: string) => {
  if (!import.meta.client) return;
  
  // Reset all theme classes first
  const themeClasses = ['dark', 'v-theme'];
  themeClasses.forEach(cls => {
    document.documentElement.classList.remove(cls);
  });
  
  // Apply the selected theme
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (theme === 'v-theme') {
    document.documentElement.classList.add('v-theme');
  } else if (theme === 'system') {
    // System preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }
  // If theme is 'light' or any other value, no class is needed
};

// Apply font size to the document
export const applyFontSize = (fontSize: string) => {
  if (!import.meta.client) return;
  document.documentElement.dataset.fontSize = fontSize;
};

// Apply accessibility settings to the document
export const applyAccessibilitySettings = (disableAnimations: boolean, highContrast: boolean) => {
  if (!import.meta.client) return;
  
  if (disableAnimations) {
    document.documentElement.classList.add('disable-animations');
  } else {
    document.documentElement.classList.remove('disable-animations');
  }
  
  if (highContrast) {
    document.documentElement.classList.add('high-contrast');
  } else {
    document.documentElement.classList.remove('high-contrast');
  }
};

// Setup keyboard event handler for Escape key
export const setupEscapeHandler = (closeHandler: () => void) => {
  if (!import.meta.client) return;
  
  const handleEscKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeHandler();
    }
  };
  
  window.addEventListener('keydown', handleEscKey);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', handleEscKey);
  };
};