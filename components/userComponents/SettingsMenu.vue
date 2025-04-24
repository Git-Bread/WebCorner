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
        <button 
          v-for="tab in filteredTabs" 
          :key="tab.id" 
          @click="activeTab = tab.id" 
          :class="['px-3 py-2 font-medium focus:outline-none whitespace-nowrap border-b-2', 
          activeTab === tab.id ? 'text-theme-primary border-theme-primary' : 'text-text hover:text-heading border-transparent']">
          <fa :icon="['fas', tab.icon]" class="mr-1" aria-hidden="true" />{{ tab.name }}
        </button>
      </div>
    </div>

    <!-- Content Area Wrapper with fixed height/width and overflow -->
    <div class="h-[20em] overflow-y-auto overflow-x-auto">
      <!-- Appearance Tab -->
      <SettingsTab 
        v-show="activeTab === 'appearance'" 
        title="Appearance">
        <!-- Theme Selection -->
        <ThemeSelector 
          :model-value="settings.appearance.theme"
          @update:theme="settingsManager.updateTheme" />
        
        <!-- Font Size -->
        <FontSizeSelector 
          :model-value="settings.appearance.fontSize"
          @update:font-size="settingsManager.updateFontSize" />
      </SettingsTab>

      <!-- Notifications Tab (User Only) -->
      <SettingsTab 
        v-show="activeTab === 'notifications'" 
        title="Notifications">
        <!-- Email Notifications -->
        <ToggleSwitch 
          label="Email Notifications"
          :model-value="userSettings.notifications?.email"
          @update:model-value="(value) => settingsManager.updateNotificationSetting('email', value)" />

        <!-- Desktop Notifications -->
        <ToggleSwitch 
          label="Desktop Notifications"
          :model-value="userSettings.notifications?.desktop" 
          @update:model-value="(value) => settingsManager.updateNotificationSetting('desktop', value)" />
      </SettingsTab>

      <!-- Privacy Tab (User Only) -->
      <SettingsTab 
        v-show="activeTab === 'privacy'" 
        title="Privacy">
        <!-- Online Status -->
        <ToggleSwitch 
          label="Show Online Status"
          :model-value="userSettings.privacy?.onlineStatus"
          @update:model-value="(value) => settingsManager.updatePrivacySetting('onlineStatus', value)" />
      </SettingsTab>

      <!-- Accessibility Tab -->
      <SettingsTab 
        v-show="activeTab === 'accessibility'" 
        title="Accessibility">
        <!-- Disable Animations -->
        <ToggleSwitch 
          label="Disable Animations"
          :model-value="settings.accessibility.disableAnimations"
          @update:model-value="(value) => settingsManager.updateAccessibilitySetting('disableAnimations', value)" />

        <!-- High Contrast -->
        <ToggleSwitch 
          label="High Contrast"
          :model-value="settings.accessibility.highContrast" 
          @update:model-value="(value) => settingsManager.updateAccessibilitySetting('highContrast', value)" />
      </SettingsTab>
    </div>

    <!-- Save Button (User Mode Only) -->
    <div v-if="props.mode === 'user'" class="pt-6 border-t border-border mt-8">
      <button 
        @click="settingsManager.saveUserSettings"
        :disabled="isSaving"
        class="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent font-medium rounded-md shadow-sm text-background bg-theme-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary disabled:bg-opacity-50 disabled:cursor-not-allowed">
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { setupEscapeHandler } from '~/utils/settingsUtils';
import { useSettingsManager } from '~/composables/useSettingsManager';
import { type UserSettings } from '~/composables/useUserSettings';

// Import UI components
import ToggleSwitch from '~/components/userComponents/ui/ToggleSwitch.vue';
import ThemeSelector from '~/components/userComponents/ui/ThemeSelector.vue';
import FontSizeSelector from '~/components/userComponents/ui/FontSizeSelector.vue';
import SettingsTab from '~/components/userComponents/ui/SettingsTab.vue';

// Define props
const props = defineProps({
  mode: {
    type: String,
    default: 'visitor',
    validator: (value: string) => ['visitor', 'user'].includes(value)
  }
});

// Define emits
const emit = defineEmits(['close-settings']);

// Configure tabs based on mode
const allTabs = [
  { id: 'appearance', name: 'Appearance', icon: 'palette', modes: ['visitor', 'user'] },
  { id: 'notifications', name: 'Notifications', icon: 'bell', modes: ['user'] },
  { id: 'privacy', name: 'Privacy', icon: 'shield', modes: ['user'] },
  { id: 'accessibility', name: 'Accessibility', icon: 'universal-access', modes: ['visitor', 'user'] }
];

// Filter tabs based on current mode
const filteredTabs = computed(() => {
  return allTabs.filter(tab => tab.modes.includes(props.mode));
});

// Active tab state - default to the first available tab
const activeTab = ref(filteredTabs.value[0]?.id || 'appearance');

// Use settings manager composable with type assertion
const settingsManager = useSettingsManager(props.mode as 'visitor' | 'user');

// Create reactive computed refs to access the settings correctly
const settings = computed(() => settingsManager.currentSettings.value);
const userSettings = computed(() => settingsManager.userModeSettings.value);
const isSaving = computed(() => settingsManager.isSaving.value);

// Setup and cleanup keyboard event handler for Escape key
let cleanupEscHandler: (() => void) | undefined;

onMounted(() => {
  // Initialize settings when component mounts
  settingsManager.initialize();

  // Setup escape key handler
  cleanupEscHandler = setupEscapeHandler(() => {
    emit('close-settings');
  });
});

// Cleanup event listeners
onBeforeUnmount(() => {
  if (cleanupEscHandler) {
    cleanupEscHandler();
  }
});
</script>