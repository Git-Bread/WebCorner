import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { type User as FirebaseUser } from 'firebase/auth';
import { handleDatabaseError } from '~/utils/errorHandler';
import { applyTheme, applyFontSize, applyAccessibilitySettings } from '~/utils/settingsUtils';
import { saveToLocalStorage, getFromLocalStorage, removeFromLocalStorage } from '~/utils/storageUtils/localStorageUtil';

// Cache constants
const SETTINGS_CACHE_KEY_PREFIX = 'webcorner_settings_';
const SETTINGS_CACHE_EXPIRY = 1000 * 60 * 60 * 24; // 24 hours

// const array for reuse
export const themeOptions = ['light', 'dark', 'v-theme'] as const;
export type ThemeOption = typeof themeOptions[number];
export const fontSizeOptions = ['small', 'medium', 'large', 'extra-large'] as const;
export type FontSizeOption = typeof fontSizeOptions[number];

// Font sizes available in the application with display names
export const fontSizes = [
  { name: 'Small', value: 'small' as FontSizeOption },
  { name: 'Medium', value: 'medium' as FontSizeOption },
  { name: 'Large', value: 'large' as FontSizeOption },
  { name: 'X-Large', value: 'extra-large' as FontSizeOption }
];

// Type guards for validation and font size options, probaly not needed
// but useful for type safety
export function isValidTheme(theme: string): theme is ThemeOption {
  return themeOptions.includes(theme as ThemeOption);
}
export function isValidFontSize(fontSize: string): fontSize is FontSizeOption {
  return fontSizeOptions.includes(fontSize as FontSizeOption);
}

// Define TypeScript types
export interface AppearanceSettings {
  theme: ThemeOption;
  fontSize: FontSizeOption;
}
export interface PrivacySettings {
  onlineStatus: boolean;
}
export interface AccessibilitySettings {
  disableAnimations: boolean;
  highContrast: boolean;
}
export interface UserSettings {
  appearance: AppearanceSettings;
  privacy: PrivacySettings;
  accessibility: AccessibilitySettings;
}

// Default settings
export const defaultSettings: UserSettings = {
  appearance: {
    theme: 'light',
    fontSize: 'medium',
  },
  privacy: {
    onlineStatus: true,
  },
  accessibility: {
    disableAnimations: false,
    highContrast: false,
  }
};

// Default settings for visitor
export const defaultVisitorSettings = {
  appearance: {
    theme: 'light' as ThemeOption, 
    fontSize: 'medium' as FontSizeOption,
  },
  accessibility: {
    disableAnimations: false,
    highContrast: false,
  }
};

export const useUserSettings = () => {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  
  // Reactive state for settings
  const settings = useState<UserSettings>('userSettings', () => ({ ...defaultSettings }));
  const isLoading = useState<boolean>('settingsLoading', () => false);
  const error = useState<string | null>('settingsError', () => null);
  
  // Load visitor settings from localStorage
  const loadVisitorSettings = () => {
    if (import.meta.client && localStorage) {
      try {
        const savedSettings = localStorage.getItem('visitorSettings');
        if (savedSettings) {
          return JSON.parse(savedSettings);
        }
      } catch (e) {
        console.error('Error loading visitor settings from localStorage:', e);
      }
    }
    return { ...defaultVisitorSettings };
  };

  // Load user settings from Firestore with caching
  const loadSettings = async (forceRefresh: boolean = false) => {
    if (!user.value) return false;
    
    isLoading.value = true;
    error.value = null;
    
    const settingsCacheKey = `${SETTINGS_CACHE_KEY_PREFIX}${user.value.uid}`;
    
    try {
      // Try to get from cache first, unless forceRefresh is true
      if (!forceRefresh && import.meta.client) {
        const cachedSettings = getFromLocalStorage(settingsCacheKey, SETTINGS_CACHE_EXPIRY);
        if (cachedSettings) {
          console.log('Using cached user settings');
          
          // Apply cached settings
          settings.value = {
            appearance: { 
              ...defaultSettings.appearance, 
              ...cachedSettings.appearance 
            },
            privacy: { 
              ...defaultSettings.privacy, 
              ...cachedSettings.privacy 
            },
            accessibility: { 
              ...defaultSettings.accessibility,
              ...cachedSettings.accessibility 
            }
          };
          
          return true;
        }
      }
      
      // If not in cache or forceRefresh is true, fetch from Firestore
      const userDocRef = doc(firestore, 'users', user.value.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userPreferences = userData?.settings?.userPreferences;
        
        if (userPreferences) {
          // If there are stored preferences, use them
          // Deep copy to avoid reference issues, and provide defaults for any missing properties
          const userSettings = {
            appearance: { 
              ...defaultSettings.appearance, 
              ...userPreferences.appearance 
            },
            privacy: { 
              ...defaultSettings.privacy, 
              ...userPreferences.privacy 
            },
            accessibility: { 
              ...defaultSettings.accessibility,
              ...userPreferences.accessibility 
            }
          };
          
          // Update state
          settings.value = userSettings;
          
          // Cache the settings
          if (import.meta.client) {
            saveToLocalStorage(settingsCacheKey, userSettings);
            console.log('Settings loaded from Firestore and cached');
          }
        } else {
          // No preferences found, but user document exists, use defaults
          settings.value = { ...defaultSettings };
          if (import.meta.client) {
            console.log('No settings found in user document, using defaults');
          }
        }
      } else {
        // User document doesn't exist, use defaults
        settings.value = { ...defaultSettings };
        if (import.meta.client) {
          console.log('User document not found, using default settings');
        }
      }
      
      return true;
    } catch (err) {
      const errorMessage = handleDatabaseError(err);
      console.error('Error loading user settings:', err);
      error.value = errorMessage;
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  // Save user settings to Firestore
  const saveSettings = async (newSettings: UserSettings): Promise<{ success: boolean, message?: string }> => {
    if (!user.value) return { success: false, message: 'Not authenticated' };
    
    isLoading.value = true;
    error.value = null;
    
    try {
      const userDocRef = doc(firestore, 'users', user.value.uid);
      
      // Update the existing document
      await updateDoc(userDocRef, {
        'settings.userPreferences': newSettings,
        'updatedAt': new Date()
      });
      
      // Update local state
      settings.value = { ...newSettings };
      
      // Update the cache
      if (import.meta.client && user.value) {
        const settingsCacheKey = `${SETTINGS_CACHE_KEY_PREFIX}${user.value.uid}`;
        saveToLocalStorage(settingsCacheKey, newSettings);
        console.log('Settings saved to Firestore and cache updated');
      }
      
      return { success: true, message: 'Settings saved successfully' };
    } catch (err) {
      const errorMessage = handleDatabaseError(err);
      console.error('Error saving user settings:', err);
      error.value = errorMessage;
      return { success: false, message: errorMessage };
    } finally {
      isLoading.value = false;
    }
  };

  // Invalidate settings cache
  const invalidateSettingsCache = () => {
    if (!user.value || !import.meta.client) return;
    
    const settingsCacheKey = `${SETTINGS_CACHE_KEY_PREFIX}${user.value.uid}`;
    removeFromLocalStorage(settingsCacheKey);
    console.log('Settings cache invalidated');
  };

  // Apply settings to the application using shared utility functions
  const applySettings = (currentSettings: UserSettings = settings.value) => {
    if (!import.meta.client) return;
    
    try {
      // Apply theme settings
      applyTheme(currentSettings.appearance.theme);
      
      // Apply font size
      applyFontSize(currentSettings.appearance.fontSize);
      
      // Apply accessibility settings
      applyAccessibilitySettings(
        currentSettings.accessibility.disableAnimations,
        currentSettings.accessibility.highContrast
      );
    } catch (err) {
      console.error('Error applying settings:', err);
    }
  };

  // Initialize settings when auth state changes
  watch(() => user.value, async (newUser: FirebaseUser | null) => {
    if (newUser) {
      await loadSettings();
      
      // Apply settings to the application on the client
      if (import.meta.client) {
        applySettings();
      }
    } else {
      // Reset to defaults when user logs out
      settings.value = { ...defaultSettings };
      
      // Clear cache when logging out
      if (import.meta.client && user.value) {
        invalidateSettingsCache();
      }
    }
  }, { immediate: true });

  return {
    settings,
    isLoading,
    error,
    loadSettings,
    saveSettings,
    applySettings,
    invalidateSettingsCache,
    fontSizes,
    themeOptions,
    fontSizeOptions,
    defaultVisitorSettings,
    isValidTheme,
    isValidFontSize,
    loadVisitorSettings
  };
};