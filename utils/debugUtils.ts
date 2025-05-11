/**
 * Debug utilities to control feature availability based on environment
 */

// Default to false in production, true in development
export const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';

// Master DEBUG_MODE flag - controls all debugging functionality
let DEBUG_MODE = IS_DEVELOPMENT;

/**
 * Check if debug mode is enabled
 */
export const isDebugMode = (): boolean => {
  // Check for runtime override from localStorage if available
  if (typeof localStorage !== 'undefined') {
    const debugSetting = localStorage.getItem('webcorner_debug_enabled');
    if (debugSetting !== null) {
      return debugSetting === 'true';
    }
  }
  
  // Fall back to current value
  return DEBUG_MODE;
};

/**
 * Enable or disable debug mode
 * @param enabled Whether debug should be enabled
 */
export const setDebugMode = (enabled: boolean): void => {
  DEBUG_MODE = enabled;
  
  // Also save to localStorage for persistence across page reloads
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('webcorner_debug_enabled', enabled ? 'true' : 'false');
    console.log(`[Debug] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
};

/**
 * Check if logging is enabled
 */
export const isLoggingEnabled = (): boolean => {
  // Check for runtime override from localStorage if available
  if (typeof localStorage !== 'undefined') {
    const loggingSetting = localStorage.getItem('webcorner_logging_enabled');
    // Default to true if not explicitly set
    if (loggingSetting !== null) {
      return loggingSetting === 'true';
    }
  }
  
  return true; // Default to enabled
};

/**
 * Get current debug mode and subsystem name for logging
 * This is what utility files should call for their debug logging
 * 
 * @param subsystem Name of the subsystem (e.g., 'storage', 'cache')
 * @returns Whether debug logging should be enabled for this subsystem
 */
export const shouldLog = (subsystem: string): boolean => {
  return isDebugMode() && isLoggingEnabled();
}; 