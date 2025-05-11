<template>
  <div>
    <!-- Loading overlay - always shows initially -->
    <Transition name="fade">
      <div v-if="isLoading || !authInitialized || !settingsLoaded" 
           class="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <ClientOnly>
          <div class="text-center">
            <fa :icon="['fas', 'spinner']" class="animate-spin text-4xl text-accent-blue mb-4" />
            <p class="text-text">{{ loadingMessage }}</p>
          </div>
        </ClientOnly>
      </div>
    </Transition>

    <!-- Main app content -->
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <ClientOnly>
        <DebugPanel />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref, computed } from 'vue';
import { useUserSettings } from '~/composables/useUserSettings';
import DebugPanel from '~/components/debug/DebugPanel.vue';

// Initialize settingsLoaded to false by default to ensure spinner shows immediately
const settingsLoaded = ref(false);
const settingsLoading = ref(false);

const { isLoading, authInitialized, isAuthenticated, user } = useAuth();
const { applySettings, settings, loadVisitorSettings, loadSettings } = useUserSettings();

// Display appropriate loading message
const loadingMessage = computed(() => {
  if (!authInitialized.value) return 'Initializing...';
  if (isAuthenticated.value && !settingsLoaded.value) return 'Loading...';
  return 'Loading...';
});

// Apply the appropriate settings when the app is mounted and auth is initialized
onMounted(() => {
  // Only run on client-side
  if (!import.meta.client) return;

  // Pre-load visitor settings from localStorage for faster initial rendering
  if (!isAuthenticated.value) {
    try {
      const visitorSettings = loadVisitorSettings();
      if (visitorSettings) {
        applySettings(visitorSettings);
      }
    } catch (e) {
      console.error('Error applying visitor settings on app load:', e);
    }
  }

  // Initialize settings based on authentication state once auth is ready
  // Declare the unwatchAuth variable first
  let unwatchAuth: () => void;
  
  unwatchAuth = watch(() => authInitialized.value, async (initialized) => {
    if (!initialized) return;
    
    try {
      if (isAuthenticated.value && user.value) {
        console.log('Loading authenticated user settings on app load');
        // For authenticated users, load settings from Firestore first
        settingsLoading.value = true;
        await loadSettings();
        
        // Then apply loaded settings
        if (settings.value) {
          applySettings(settings.value);
        }
        
        settingsLoaded.value = true;
      } else {
        console.log('Applying visitor settings on app load');
        // For visitors, apply settings from localStorage
        const visitorSettings = loadVisitorSettings();
        if (visitorSettings) {
          applySettings(visitorSettings);
        }
        
        settingsLoaded.value = true;
      }
    } catch (e) {
      console.error('Error applying settings on app load:', e);
      // Even if there's an error, mark as loaded to avoid blocking UI
      settingsLoaded.value = true;
    } finally {
      settingsLoading.value = false;
      // Unwatch after first attempt, successful or not
      if (unwatchAuth) {
        unwatchAuth();
      }
    }
  }, { immediate: true });
});
</script>