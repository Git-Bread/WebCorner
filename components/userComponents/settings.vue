<template>
  <div class="fixed bottom-4 right-4 p-4 rounded-lg shadow-lg bg-surface w-full max-w-lg z-50">
    <!-- Close Button -->
    <button 
      @click="$emit('close-settings')"
      class="absolute top-2 right-2 p-2 rounded-full text-text hover:bg-border focus:outline-none focus:ring-2 focus:ring-link"
      aria-label="Close settings">
      <fa :icon="['fas', 'times']" class="w-4 h-4" />
    </button>

    <!-- Settings Navigation Tabs -->
    <div class="mb-6 border-b border-border">
      <div class="flex flex-wrap gap-2">
        <button v-for="(tab, index) in tabs" :key="index" @click="activeTab = tab.id" :class="['px-3 py-2 font-medium focus:outline-none whitespace-nowrap border-b-2', 
        activeTab === tab.id ? 'text-accent-blue border-accent-blue' : 'text-text hover:text-heading border-transparent']">
        <fa :icon="['fas', tab.icon]" class="mr-1" aria-hidden="true" />{{ tab.name }}</button>
      </div>
    </div>

    <!-- Content Area Wrapper -->
    <div :style="{ minHeight: contentMinHeight + 'px' }">
      <!-- Appearance Settings -->
      <div v-show="activeTab === 'appearance'" ref="appearanceContent" class="space-y-6">
        <h3 class="font-medium text-heading">Appearance</h3>
        <div class="space-y-4">
          <!-- Theme Selection -->
          <div>
            <label class="block font-medium text-text mb-1">Theme</label>
            <div class="flex space-x-4">
              <button 
                @click="updateTheme('light')"
                :class="['p-3 border rounded-md hover:border-link focus:outline-none focus:ring-2 focus:ring-link',
                  userSettings.appearance.theme === 'light' ? 'border-accent-blue ring-2 ring-accent-blue bg-surface' : 'bg-background border-border']">
                <span class="block w-full text-center">Light</span>
              </button>
              <button 
                @click="updateTheme('dark')"
                :class="['p-3 border rounded-md hover:border-link focus:outline-none focus:ring-2 focus:ring-link',
                  userSettings.appearance.theme === 'dark' ? 'border-accent-blue ring-2 ring-accent-blue bg-surface' : 'bg-background border-border']">
                <span class="block w-full text-center">Dark</span>
              </button>
              <button 
                @click="updateTheme('system')"
                :class="['p-3 border rounded-md hover:border-link focus:outline-none focus:ring-2 focus:ring-link',
                  userSettings.appearance.theme === 'system' ? 'border-accent-blue ring-2 ring-accent-blue bg-surface' : 'bg-background border-border']">
                <span class="block w-full text-center">System</span>
              </button>
            </div>
          </div>

          <!-- Font Size -->
          <div>
            <label class="block font-medium text-text mb-1">Font Size</label>
            <div class="flex space-x-2">
              <button 
                v-for="size in fontSizes" 
                :key="size.value"
                @click="updateFontSize(size.value)"
                :class="[
                  'p-3 border rounded-md w-24 h-24 flex flex-col items-center justify-center',
                  userSettings.appearance.fontSize === size.value 
                    ? 'border-accent-blue ring-2 ring-accent-blue bg-surface'
                    : 'border-border bg-background hover:border-link focus:outline-none focus:ring-2 focus:ring-link'
                ]">
                <span :class="['font-bold']">Wc</span> <!-- Removed size.exampleClass -->
                <span class="mt-1">{{ size.name }}</span> <!-- Removed text-xs -->
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Notifications Settings -->
      <div v-show="activeTab === 'notifications'" ref="notificationsContent" class="space-y-6">
        <h3 class="font-medium text-heading">Notifications</h3>
        
        <div class="space-y-4">
          <!-- Email Notifications -->
          <div class="flex items-center justify-between">
            <span class="font-medium text-text">Email Notifications</span>
            <button type="button" :class="getToggleTrackClasses(userSettings.notifications.email)" @click="userSettings.notifications.email = !userSettings.notifications.email">
              <span :class="getToggleThumbClasses(userSettings.notifications.email)"></span>
            </button>
          </div>

          <!-- Desktop Notifications -->
          <div class="flex items-center justify-between">
            <span class="font-medium text-text">Desktop Notifications</span>
             <button type="button" :class="getToggleTrackClasses(userSettings.notifications.desktop)" @click="userSettings.notifications.desktop = !userSettings.notifications.desktop">
              <span :class="getToggleThumbClasses(userSettings.notifications.desktop)"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- Privacy Settings -->
      <div v-show="activeTab === 'privacy'" ref="privacyContent" class="space-y-6">
        <h3 class="font-medium text-heading">Privacy</h3>
        <div class="space-y-4">
          <!-- Online Status -->
          <div class="flex items-center justify-between">
            <span class="font-medium text-text">Show Online Status</span>
            <button type="button" :class="getToggleTrackClasses(userSettings.privacy.onlineStatus)" @click="userSettings.privacy.onlineStatus = !userSettings.privacy.onlineStatus">
              <span :class="getToggleThumbClasses(userSettings.privacy.onlineStatus)"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- Accessibility Settings -->
      <div v-show="activeTab === 'accessibility'" ref="accessibilityContent" class="space-y-6">
        <h3 class="font-medium text-heading">Accessibility</h3>
        
        <div class="space-y-4">
          <!-- Disable Animations (formerly Reduced Motion) -->
          <div class="flex items-center justify-between">
            <span class="font-medium text-text">Disable Animations</span>
            <button type="button" :class="getToggleTrackClasses(userSettings.accessibility.disableAnimations)" 
              @click="updateAccessibility('disableAnimations', !userSettings.accessibility.disableAnimations)">
              <span :class="getToggleThumbClasses(userSettings.accessibility.disableAnimations)"></span>
            </button>
          </div>

          <!-- High Contrast -->
          <div class="flex items-center justify-between">
            <span class="font-medium text-text">High Contrast</span>
            <button type="button" :class="getToggleTrackClasses(userSettings.accessibility.highContrast)"
              @click="updateAccessibility('highContrast', !userSettings.accessibility.highContrast)">
              <span :class="getToggleThumbClasses(userSettings.accessibility.highContrast)"></span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div class="pt-6 border-t border-border mt-8">
      <button 
        @click="saveUserSettings"
        :disabled="isSaving"
        class="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent font-medium rounded-md shadow-sm text-white bg-accent-blue hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-blue disabled:bg-opacity-50 disabled:cursor-not-allowed">
        <fa v-if="!isSaving" :icon="['fas', 'save']" class="mr-2" aria-hidden="true" />
        <span v-else class="mr-2 animate-spin">
          <fa :icon="['fas', 'spinner']" aria-hidden="true" />
        </span>
        {{ isSaving ? 'Saving...' : 'Save Settings' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, defineEmits, watch } from 'vue';
import { useUserSettings, type UserSettings } from '~/composables/useUserSettings';
import { showToast } from '~/utils/toast';
import { getToggleTrackClasses, getToggleThumbClasses } from '~/utils/settingsUtils'; // Import utility functions

// Define emits
const emit = defineEmits(['close-settings']);

// Initialize user settings composable
const { settings, isLoading, error, saveSettings, applySettings } = useUserSettings();

// Define tabs for settings navigation
const tabs = [
  { id: 'appearance', name: 'Appearance', icon: 'palette' },
  { id: 'notifications', name: 'Notifications', icon: 'bell' },
  { id: 'privacy', name: 'Privacy', icon: 'shield' },
  { id: 'accessibility', name: 'Accessibility', icon: 'universal-access' }
];

// Active tab state
const activeTab = ref('appearance');

// Refs for tab content elements
const appearanceContent = ref<HTMLElement | null>(null);
const notificationsContent = ref<HTMLElement | null>(null);
const privacyContent = ref<HTMLElement | null>(null);
const accessibilityContent = ref<HTMLElement | null>(null);

// Ref for minimum content height
const contentMinHeight = ref(0);

// Font size options
const fontSizes = [
  { name: 'Small', value: 'small' as const },
  { name: 'Medium', value: 'medium' as const },
  { name: 'Large', value: 'large' as const },
  { name: 'X-Large', value: 'extra-large' as const }
];

// Create local copy of settings for editing
const userSettings = ref<UserSettings>(JSON.parse(JSON.stringify(settings.value)));

// Save state
const isSaving = ref(false);

// Update theme when changed
const updateTheme = (theme: 'light' | 'dark' | 'system') => {
  userSettings.value.appearance.theme = theme;
  applySettings(userSettings.value);
};

// Update font size when changed
const updateFontSize = (size: 'small' | 'medium' | 'large' | 'extra-large') => {
  userSettings.value.appearance.fontSize = size;
  applySettings(userSettings.value);
};

// Update accessibility settings
const updateAccessibility = (key: keyof UserSettings['accessibility'], value: boolean) => {
  userSettings.value.accessibility[key] = value;
  applySettings(userSettings.value);
};

// Save settings to Firestore
const saveUserSettings = async () => {
  isSaving.value = true;
  
  try {
    const result = await saveSettings(userSettings.value);
    
    if (result.success) {
      // Show success toast
      if (process.client) {
        showToast('Settings saved successfully', 'success');
      }
    } else {
      // Show error toast
      if (process.client) {
        showToast(result.message || 'Failed to save settings', 'error');
      }
    }
  } catch (err) {
    console.error('Error saving settings:', err);
    if (process.client) {
      showToast('An unexpected error occurred', 'error');
    }
  } finally {
    isSaving.value = false;
  }
};

// Calculate and set minimum height after component mounts
onMounted(async () => {
  // Sync local settings with global settings
  userSettings.value = JSON.parse(JSON.stringify(settings.value));
  
  await nextTick(); // Wait for DOM updates

  const contentElements = [
    appearanceContent.value,
    notificationsContent.value,
    privacyContent.value,
    accessibilityContent.value
  ].filter(el => el !== null) as HTMLElement[];

  if (contentElements.length > 0) {
    const heights = contentElements.map(el => el.scrollHeight);
    contentMinHeight.value = Math.max(...heights);
  }
});

// Watch for settings changes from the composable
watch(() => settings.value, (newSettings) => {
  userSettings.value = JSON.parse(JSON.stringify(newSettings));
}, { deep: true });
</script>