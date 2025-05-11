/**
 * Debug utilities to control feature availability based on environment
 * 
 * Debug mode is always enabled in development environment
 */

// Constants
export const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';
const LOGGING_KEY = 'webcorner_logging_enabled';

/**
 * Check if debug mode is enabled
 * - In development: Always returns true
 * - In production: Only true if explicitly enabled in localStorage
 */
export const isDebugMode = (): boolean => {
  if (IS_DEVELOPMENT) return true;
  return false; // Default to disabled in production
};

/**
 * Check if logging is enabled (default: true)
 */
export const isLoggingEnabled = (): boolean => {
  if (typeof localStorage === 'undefined') return true;
  
  const loggingSetting = localStorage.getItem(LOGGING_KEY);
  if (loggingSetting === null) return true; // Default to enabled
  
  return loggingSetting === 'true';
};

/**
 * Shorthand to check if debug logging should be shown
 * 
 * Both debug mode AND logging must be enabled
 */
export const shouldLog = (subsystem: string): boolean => {
  return isDebugMode() && isLoggingEnabled();
}; 