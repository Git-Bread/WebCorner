import { ref, computed, watch } from 'vue';
import { showToast } from '~/utils/toast';
import { 
  useUserSettings, 
  type UserSettings, 
  type AppearanceSettings, 
  type AccessibilitySettings,
  type ThemeOption,
  type FontSizeOption,
  isValidTheme,
  isValidFontSize
} from '~/composables/useUserSettings';

// Interface for visitor settings (simplified from UserSettings)
interface VisitorSettingsType {
  appearance: AppearanceSettings;
  accessibility: AccessibilitySettings;
}

export const useSettingsManager = (mode: 'visitor' | 'user') => {
  // Save state for user mode
  const isSaving = ref(false);

  // Get settings manager and types from composables
  const { 
    settings: userSettingsApi, 
    saveSettings, 
    applySettings,
    defaultVisitorSettings 
  } = useUserSettings();

  // Create reactive references for both visitor and user settings
  const visitorSettings = ref<VisitorSettingsType>(loadVisitorSettings());
  const userModeSettings = ref<UserSettings>(userSettingsApi.value || {} as UserSettings);

  // Load visitor settings from localStorage
  function loadVisitorSettings(): VisitorSettingsType {
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
  }

  // Get the appropriate settings object based on mode
  const currentSettings = computed(() => {
    return mode === 'visitor' ? visitorSettings.value : userModeSettings.value;
  });

  // Apply settings to the application
  const applyCurrentSettings = () => {
    if (!import.meta.client) return;
    
    try {
      const settings = currentSettings.value;
      
      // applySettings function to keep application in sync
      if (mode === 'visitor') {
        applySettings(settings as UserSettings);
        
        // Save to localStorage automatically for visitor mode
        if (import.meta.client && localStorage) {
          localStorage.setItem('visitorSettings', JSON.stringify(visitorSettings.value));
        }
      } else {
        // For user mode use the composable
        applySettings(settings as UserSettings);
      }
    } catch (err) {
      console.error('Error applying settings:', err);
    }
  };

  // Update theme when changed
  const updateTheme = (theme: ThemeOption) => {
    if (mode === 'visitor') {
      visitorSettings.value.appearance.theme = theme;
    } else {
      userModeSettings.value.appearance.theme = theme;
    }
    applyCurrentSettings();
  };

  // Update font size when changed
  const updateFontSize = (fontSize: FontSizeOption) => {
    if (mode === 'visitor') {
      visitorSettings.value.appearance.fontSize = fontSize;
    } else {
      userModeSettings.value.appearance.fontSize = fontSize;
    }
    applyCurrentSettings();
  };

  // Update accessibility settings
  const updateAccessibilitySetting = (key: keyof AccessibilitySettings, value: boolean) => {
    if (mode === 'visitor') {
      visitorSettings.value.accessibility[key] = value;
    } else {
      userModeSettings.value.accessibility[key] = value;
    }
    applyCurrentSettings();
  };

  // Update notification settings (user mode only)
  const updateNotificationSetting = (key: keyof typeof userModeSettings.value.notifications, value: boolean) => {
    if (mode === 'user') {
      userModeSettings.value.notifications[key] = value;
    }
  };

  // Update privacy settings (user mode only)
  const updatePrivacySetting = (key: keyof typeof userModeSettings.value.privacy, value: boolean) => {
    if (mode === 'user') {
      userModeSettings.value.privacy[key] = value;
    }
  };

  // Save user settings to Firestore (user mode only)
  const saveUserSettings = async (): Promise<void> => {
    if (mode !== 'user') return;
    
    isSaving.value = true;
    
    try {
      const result = await saveSettings(userModeSettings.value);
      
      if (result.success) {
        // Show success toast
        if (import.meta.client) {
          showToast('Settings saved successfully', 'success');
        }
      } else {
        // Show error toast
        if (import.meta.client) {
          showToast(result.message || 'Failed to save settings', 'error');
        }
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      if (import.meta.client) {
        showToast('An unexpected error occurred', 'error');
      }
    } finally {
      isSaving.value = false;
    }
  };

  // Watch for settings changes from the composable (user mode only)
  if (mode === 'user') {
    watch(() => userSettingsApi.value, (newSettings) => {
      if (newSettings) {
        userModeSettings.value = JSON.parse(JSON.stringify(newSettings));
      }
    }, { deep: true });
  }

  // Initialize settings
  const initialize = () => {
    applyCurrentSettings();
  };

  return {
    currentSettings,
    isSaving,
    visitorSettings,
    userModeSettings,
    updateTheme,
    updateFontSize,
    updateAccessibilitySetting,
    updateNotificationSetting,
    updatePrivacySetting,
    saveUserSettings,
    initialize
  };
};