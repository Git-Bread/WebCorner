import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { type User as FirebaseUser } from 'firebase/auth';
import { handleDatabaseError } from '~/utils/errorHandler';
import { applyTheme, applyFontSize, applyAccessibilitySettings } from '~/utils/settingsUtils';

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

  // Load user settings from Firestore
  const loadSettings = async () => {
    if (!user.value) return false;
    
    isLoading.value = true;
    error.value = null;
    
    try {
      const userDocRef = doc(firestore, 'users', user.value.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userPreferences = userData?.settings?.userPreferences;
        
        if (userPreferences) {
          // If there are stored preferences, use them
          // Deep copy to avoid reference issues, and provide defaults for any missing properties
          settings.value = {
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
          
          if (import.meta.client) {
            console.log('Settings loaded from Firestore');
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
    }
  }, { immediate: true });

  return {
    settings,
    isLoading,
    error,
    loadSettings,
    saveSettings,
    applySettings,
    fontSizes,
    themeOptions,
    fontSizeOptions,
    defaultVisitorSettings,
    isValidTheme,
    isValidFontSize,
    loadVisitorSettings
  };
};