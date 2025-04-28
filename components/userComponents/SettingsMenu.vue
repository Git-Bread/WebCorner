<template>
  <div 
    class="fixed bottom-4 right-1 sm:right-4 p-4 rounded-lg shadow-lg bg-ui-panel border border-border w-full max-w-lg z-50"
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-title">
    <!-- Header with title -->
    <h2 id="settings-title" class="sr-only">Settings Menu</h2>
    
    <!-- Close Button -->
    <button 
      @click="$emit('close-settings')"
      class="absolute top-2 right-2 p-2 rounded-full text-text hover:bg-border focus:outline-none focus:ring-2 focus:ring-link"
      aria-label="Close settings">
      <fa :icon="['fas', 'times']" class="w-4 h-4" />
    </button>

    <!-- Settings Navigation Tabs -->
    <TabNavigation 
      :tabs="filteredTabs" 
      :active-tab="activeTab" 
      @update:active-tab="activeTab = $event" />

    <!-- Content Area Wrapper with fixed height/width and overflow -->
    <div 
      class="h-[20em] overflow-y-auto overflow-x-auto pr-2 pl-2"
      role="tabpanel"
      :id="`panel-${activeTab}`"
      :aria-labelledby="`tab-${activeTab}`">
      <!-- Dynamic Component Loading -->
      <component 
        :is="currentTabComponent" 
        :settings="tabSettings"
        @update:theme="settingsManager.updateTheme"
        @update:font-size="settingsManager.updateFontSize"
        @update:notification="(key: keyof NotificationSettings, value: boolean) => settingsManager.updateNotificationSetting(key, value)"
        @update:privacy="(key: keyof PrivacySettings, value: boolean) => settingsManager.updatePrivacySetting(key, value)"
        @update:accessibility="(key: keyof AccessibilitySettings, value: boolean) => settingsManager.updateAccessibilitySetting(key, value)">
      </component>
    </div>

    <!-- Save Button (User Mode Only) -->
    <div v-if="props.mode === 'user'" class="pt-6 border-t border-border mt-8">
      <button 
        @click="settingsManager.saveUserSettings"
        :disabled="isSaving"
        class="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent font-medium rounded-md shadow-sm text-background bg-theme-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary disabled:bg-opacity-50 disabled:cursor-not-allowed"
        aria-live="polite">
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
import { ref, computed, onMounted, onBeforeUnmount, defineAsyncComponent } from 'vue';
import { setupEscapeHandler } from '~/utils/settingsUtils';
import { useSettingsManager } from '~/composables/useSettingsManager';
import { 
  type AccessibilitySettings, 
  type NotificationSettings, 
  type PrivacySettings 
} from '~/composables/useUserSettings';

// Import UI components
import TabNavigation from '~/components/userComponents/ui/TabNavigation.vue';

// Lazily load tab components with loading and error states
const AppearanceTab = defineAsyncComponent({
  loader: () => import('~/components/userComponents/settings/AppearanceTab.vue'),
  loadingComponent: () => import('~/components/userComponents/ui/AsyncLoading.vue'),
  errorComponent: {
    template: '<div class="text-red-500 p-4">Failed to load component</div>'
  },
  delay: 200,
  timeout: 5000
});

const NotificationsTab = defineAsyncComponent({
  loader: () => import('~/components/userComponents/settings/NotificationsTab.vue'),
  loadingComponent: () => import('~/components/userComponents/ui/AsyncLoading.vue'),
  errorComponent: {
    template: '<div class="text-red-500 p-4">Failed to load component</div>'
  },
  delay: 200,
  timeout: 5000
});

const PrivacyTab = defineAsyncComponent({
  loader: () => import('~/components/userComponents/settings/PrivacyTab.vue'),
  loadingComponent: () => import('~/components/userComponents/ui/AsyncLoading.vue'),
  errorComponent: {
    template: '<div class="text-red-500 p-4">Failed to load component</div>'
  },
  delay: 200,
  timeout: 5000
});

const AccessibilityTab = defineAsyncComponent({
  loader: () => import('~/components/userComponents/settings/AccessibilityTab.vue'),
  loadingComponent: () => import('~/components/userComponents/ui/AsyncLoading.vue'),
  errorComponent: {
    template: '<div class="text-red-500 p-4">Failed to load component</div>'
  },
  delay: 200,
  timeout: 5000
});

// Define types for tab configuration
interface TabConfig {
  id: string;
  name: string;
  icon: string;
  modes: string[];
  component: Component;
}

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
const allTabs: TabConfig[] = [
  { id: 'appearance', name: 'Appearance', icon: 'palette', modes: ['visitor', 'user'], component: AppearanceTab },
  { id: 'notifications', name: 'Notifications', icon: 'bell', modes: ['user'], component: NotificationsTab },
  { id: 'privacy', name: 'Privacy', icon: 'shield', modes: ['user'], component: PrivacyTab },
  { id: 'accessibility', name: 'Accessibility', icon: 'universal-access', modes: ['visitor', 'user'], component: AccessibilityTab }
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

// Determine the current tab component dynamically
const currentTabComponent = computed(() => {
  const tab = allTabs.find(t => t.id === activeTab.value);
  return tab?.component || null;
});

// Prepare settings to pass to the current tab
const tabSettings = computed(() => {
  switch (activeTab.value) {
    case 'appearance':
      return {
        appearance: settings.value.appearance,
        accessibility: settings.value.accessibility
      };
    case 'notifications':
      return {
        notifications: userSettings.value.notifications || {}
      };
    case 'privacy':
      return {
        privacy: userSettings.value.privacy || {}
      };
    case 'accessibility':
      return {
        accessibility: settings.value.accessibility || {}
      };
    default:
      return {};
  }
});

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