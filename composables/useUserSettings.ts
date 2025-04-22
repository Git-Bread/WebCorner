import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { type User as FirebaseUser } from 'firebase/auth';
import { handleDatabaseError } from '~/utils/errorHandler';
import { applyTheme, applyFontSize, applyAccessibilitySettings } from '~/utils/settingsUtils';

// Define TypeScript types for our settings
export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
}

export interface NotificationSettings {
  email: boolean;
  desktop: boolean;
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
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  accessibility: AccessibilitySettings;
}

// Default settings
export const defaultSettings: UserSettings = {
  appearance: {
    theme: 'system',
    fontSize: 'medium',
  },
  notifications: {
    email: true,
    desktop: true,
  },
  privacy: {
    onlineStatus: true,
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
          // If we have stored preferences, use them
          // Deep copy to avoid reference issues, and provide defaults for any missing properties
          settings.value = {
            appearance: { 
              ...defaultSettings.appearance, 
              ...userPreferences.appearance 
            },
            notifications: { 
              ...defaultSettings.notifications,
              ...userPreferences.notifications 
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
      
      // Apply settings to the application if we're on the client
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
    applySettings
  };
};