<template>
  <div>
    <!-- Loading overlay -->
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

const settingsLoaded = ref(false);
const settingsLoading = ref(false);

const { isLoading, authInitialized, isAuthenticated, user } = useAuth();
const { applySettings, settings, loadVisitorSettings, loadSettings } = useUserSettings();

// Determine loading message based on application state
const loadingMessage = computed(() => {
  if (!authInitialized.value) return 'Initializing...';
  if (isAuthenticated.value && !settingsLoaded.value) return 'Loading...';
  return 'Loading...';
});

onMounted(() => {
  if (!import.meta.client) return;

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

  let unwatchAuth: () => void;
  
  unwatchAuth = watch(() => authInitialized.value, async (initialized) => {
    if (!initialized) return;
    
    try {
      if (isAuthenticated.value && user.value) {
        settingsLoading.value = true;
        await loadSettings();
        
        if (settings.value) {
          applySettings(settings.value);
        }
        
        settingsLoaded.value = true;
      } else {
        const visitorSettings = loadVisitorSettings();
        if (visitorSettings) {
          applySettings(visitorSettings);
        }
        
        settingsLoaded.value = true;
      }
    } catch (e) {
      console.error('Error applying settings on app load:', e);
      settingsLoaded.value = true;
    } finally {
      settingsLoading.value = false;
      if (unwatchAuth) {
        unwatchAuth();
      }
    }
  }, { immediate: true });
});
</script>