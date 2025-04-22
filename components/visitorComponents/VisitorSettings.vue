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
    <div :style="{ minWidth: contentMinWidth + 'px', minHeight: contentMinHeight + 'px' }">
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
                  settings.appearance.theme === 'light' ? 'border-accent-blue ring-2 ring-accent-blue bg-surface' : 'bg-background border-border']">
                <span class="block w-full text-center">Light</span>
              </button>
              <button 
                @click="updateTheme('dark')"
                :class="['p-3 border rounded-md hover:border-link focus:outline-none focus:ring-2 focus:ring-link',
                  settings.appearance.theme === 'dark' ? 'border-accent-blue ring-2 ring-accent-blue bg-surface' : 'bg-background border-border']">
                <span class="block w-full text-center">Dark</span>
              </button>
              <button 
                @click="updateTheme('system')"
                :class="['p-3 border rounded-md hover:border-link focus:outline-none focus:ring-2 focus:ring-link',
                  settings.appearance.theme === 'system' ? 'border-accent-blue ring-2 ring-accent-blue bg-surface' : 'bg-background border-border']">
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
                  settings.appearance.fontSize === size.value 
                    ? 'border-accent-blue ring-2 ring-accent-blue bg-surface'
                    : 'border-border bg-background hover:border-link focus:outline-none focus:ring-2 focus:ring-link'
                ]">
                <span class="font-bold">Wc</span>
                <span class="mt-1">{{ size.name }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Accessibility Settings -->
      <div v-show="activeTab === 'accessibility'" ref="accessibilityContent" class="space-y-6">
        <h3 class="font-medium text-heading">Accessibility</h3>
        
        <div class="space-y-4">
          <!-- Disable Animations -->
          <div class="flex items-center justify-between">
            <span class="font-medium text-text">Disable Animations</span>
            <button type="button" :class="getToggleTrackClasses(settings.accessibility.disableAnimations)" 
              @click="updateAccessibility('disableAnimations', !settings.accessibility.disableAnimations)">
              <span :class="getToggleThumbClasses(settings.accessibility.disableAnimations)"></span>
            </button>
          </div>

          <!-- High Contrast -->
          <div class="flex items-center justify-between">
            <span class="font-medium text-text">High Contrast</span>
            <button type="button" :class="getToggleTrackClasses(settings.accessibility.highContrast)"
              @click="updateAccessibility('highContrast', !settings.accessibility.highContrast)">
              <span :class="getToggleThumbClasses(settings.accessibility.highContrast)"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, defineEmits } from 'vue';
import { 
  getToggleTrackClasses, 
  getToggleThumbClasses, 
  applyTheme,
  applyFontSize,
  applyAccessibilitySettings,
  setupEscapeHandler
} from '~/utils/settingsUtils';

// Define emits
const emit = defineEmits(['close-settings']);

// Define types directly in the component
interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
}

interface AccessibilitySettings {
  disableAnimations: boolean;
  highContrast: boolean;
}

interface VisitorSettings {
  appearance: AppearanceSettings;
  accessibility: AccessibilitySettings;
}

// Default settings with light theme as default
const defaultSettings: VisitorSettings = {
  appearance: {
    theme: 'light', // Changed to light as default
    fontSize: 'medium',
  },
  accessibility: {
    disableAnimations: false,
    highContrast: false,
  }
};

// Load settings from localStorage
const loadSettings = (): VisitorSettings => {
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
  return { ...defaultSettings };
};

// Create reactive state for settings
const settings = ref<VisitorSettings>(loadSettings());

// Define tabs for settings navigation
const tabs = [
  { id: 'appearance', name: 'Appearance', icon: 'palette' },
  { id: 'accessibility', name: 'Accessibility', icon: 'universal-access' }
];

// Active tab state
const activeTab = ref('appearance');

// Refs for tab content elements
const appearanceContent = ref<HTMLElement | null>(null);
const accessibilityContent = ref<HTMLElement | null>(null);

// Refs for minimum height and width
const contentMinHeight = ref(0);
const contentMinWidth = ref(0);

// Font size options
const fontSizes = [
  { name: 'Small', value: 'small' as const },
  { name: 'Medium', value: 'medium' as const },
  { name: 'Large', value: 'large' as const },
  { name: 'X-Large', value: 'extra-large' as const }
];

// Apply settings to the application
const applySettings = () => {
  if (!import.meta.client) return;
  
  try {
    // Apply theme settings
    applyTheme(settings.value.appearance.theme);
    
    // Apply font size
    applyFontSize(settings.value.appearance.fontSize);
    
    // Apply accessibility settings
    applyAccessibilitySettings(
      settings.value.accessibility.disableAnimations,
      settings.value.accessibility.highContrast
    );

    // Save to localStorage automatically when settings change
    if (import.meta.client && localStorage) {
      localStorage.setItem('visitorSettings', JSON.stringify(settings.value));
    }
  } catch (err) {
    console.error('Error applying visitor settings:', err);
  }
};

// Update theme when changed
const updateTheme = (theme: 'light' | 'dark' | 'system') => {
  settings.value.appearance.theme = theme;
  applySettings();
};

// Update font size when changed
const updateFontSize = (size: 'small' | 'medium' | 'large' | 'extra-large') => {
  settings.value.appearance.fontSize = size;
  applySettings();
};

// Update accessibility settings
const updateAccessibility = (key: keyof AccessibilitySettings, value: boolean) => {
  settings.value.accessibility[key] = value;
  applySettings();
};

// Setup and cleanup keyboard event handler for Escape key
let cleanupEscHandler: (() => void) | undefined;

onMounted(async () => {
  await nextTick(); // Wait for DOM updates

  // Calculate height
  const contentElements = [
    appearanceContent.value,
    accessibilityContent.value
  ].filter(el => el !== null) as HTMLElement[];

  if (contentElements.length > 0) {
    const heights = contentElements.map(el => el.scrollHeight);
    contentMinHeight.value = Math.max(...heights);
    
    // Calculate width - maintain width of the largest tab
    const widths = contentElements.map(el => el.scrollWidth);
    contentMinWidth.value = Math.max(...widths);
  }
  
  // Apply settings when component mounts
  applySettings();

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