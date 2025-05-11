<template>
  <!-- Full Debug Panel when visible -->
  <div v-if="panelVisible" class="fixed bottom-0 left-0 z-50 bg-background border border-border rounded-tr-lg shadow-lg p-4 max-w-[270px] text-sm">
    <!-- Header section -->
    <div class="items-center mb-3">
      <h3 class="font-extrabold text-heading">Debug Panel</h3>
      <div class="w-full mt-1 grid grid-cols-2 gap-2">
        <button @click="toggleLogging" 
          :class="loggingEnabled ? 'bg-theme-primary text-background' : 'bg-surface text-text border border-border'" 
          class="py-2 px-3 rounded-md hover:bg-opacity-80 transition-all flex items-center justify-center">
          <fa :icon="['fas', 'terminal']" class="mr-2" aria-hidden="true" />
          Logging {{ loggingEnabled ? 'On' : 'Off' }}
        </button>
        <button v-if="!isDevelopment" @click="toggleDebugMode" class="py-2 px-3 bg-error text-background rounded-md hover:bg-error/80 transition-all flex items-center justify-center">
          <fa :icon="['fas', 'power-off']" class="mr-2" aria-hidden="true" />
          Disable
        </button>
        <div v-else class="py-2 px-3 bg-theme-secondary text-background rounded-md flex items-center justify-center opacity-80">
          <fa :icon="['fas', 'code']" class="mr-2" aria-hidden="true" />
          Dev Mode
        </div>
      </div>
    </div>
    
    <!-- Cache controls section -->
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <button @click="clearLocalStorage" class="py-2 px-3 bg-theme-primary text-background rounded-md hover:bg-theme-secondary transition-all flex items-center justify-center" title="Clear localStorage">
          <fa :icon="['fas', 'database']" class="mr-2" aria-hidden="true" />
          Storage
        </button>
        <button @click="clearCache" class="py-2 px-3 bg-theme-secondary text-background rounded-md hover:bg-theme-tertiary transition-all flex items-center justify-center" title="Clear memory cache">
          <fa :icon="['fas', 'memory']" class="mr-2" aria-hidden="true" />
          Cache
        </button>
        <button @click="clearAllCaches" class="py-2 px-3 bg-error text-background rounded-md hover:bg-error/90 transition-all flex items-center justify-center" title="Clear all caches">
          <fa :icon="['fas', 'trash']" class="mr-2" aria-hidden="true" />
          All
        </button>
        <button @click="showCacheInfo" class="py-2 px-3 border border-border text-text rounded-md hover:bg-surface transition-all flex items-center justify-center" title="Show cache info in console">
          <fa :icon="['fas', 'info-circle']" class="mr-2" aria-hidden="true" />
          Info
        </button>
      </div>
    </div>
    
    <div class="text-xs text-text-muted mt-4 text-center">Press <span class="font-medium">Alt+D</span> to toggle</div>
  </div>
  
  <!-- Minimal button when panel is collapsed -->
  <div v-else class="fixed bottom-0 left-0 z-50">
    <button @click="panelVisible = true" class="px-3 py-2 text-xs font-medium bg-background border-t border-r border-border text-text rounded-tr-md hover:bg-surface transition-colors" title="Show debug panel">
      <fa :icon="['fas', 'bug']" class="mr-1" aria-hidden="true" />
      Debug
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { clearAllApplicationStorage, getLocalStorageSize } from '~/utils/storageUtils/localStorageUtil';
import { clearCache as clearMemoryCache } from '~/utils/storageUtils/cacheUtil';
import { clearImageCache } from '~/utils/storageUtils/imageCacheUtil';
import { showToast } from '~/utils/toast';
import { isLoggingEnabled, IS_DEVELOPMENT } from '~/utils/debugUtils';

// Constants
const LOGGING_KEY = 'webcorner_logging_enabled';
const DEBUG_KEY = 'webcorner_debug_enabled';

// State
const isDevelopment = IS_DEVELOPMENT;
const panelVisible = ref(false);
const loggingEnabled = ref(true);
// Debug is always enabled in development mode
const debugEnabled = ref(IS_DEVELOPMENT);

// Keep reference to original console.debug
const originalConsoleDebug = console.debug;

// Toggle logging
function toggleLogging() {
  // Toggle the value
  loggingEnabled.value = !loggingEnabled.value;
  
  // Save to localStorage directly - this is what debugUtils.isLoggingEnabled() checks
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LOGGING_KEY, loggingEnabled.value ? 'true' : 'false');
  }
  
  // Apply the new setting to console
  applyLoggingSetting();
  
  // Show toast
  showToast(`Console logging ${loggingEnabled.value ? 'enabled' : 'disabled'}`, 'info');
}

// Apply logging setting to console
function applyLoggingSetting() {
  if (!loggingEnabled.value) {
    console.debug = () => {}; // Replace with no-op
  } else {
    console.debug = originalConsoleDebug; // Restore original
  }
}

// Toggle debug mode (only used in production)
function toggleDebugMode() {
  if (isDevelopment) return; // No-op in development
  
  // Toggle debug state
  debugEnabled.value = !debugEnabled.value;
  
  // In production, we directly update localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DEBUG_KEY, debugEnabled.value ? 'true' : 'false');
  }
  
  if (!debugEnabled.value) {
    panelVisible.value = false;
    showToast('Debug mode disabled', 'info');
  } else {
    showToast('Debug mode enabled', 'info');
  }
}

// Handle keyboard shortcut
function handleKeyDown(event: KeyboardEvent) {
  if (event.altKey && event.key === 'd') {
    panelVisible.value = !panelVisible.value;
    
    if (panelVisible.value) {
      showToast('Debug panel opened', 'info');
    }
  }
}

// Clear localStorage
function clearLocalStorage() {
  try {
    const sizeBefore = getLocalStorageSize();
    clearAllApplicationStorage('webcorner');
    showToast(`Cleared localStorage (${Math.round((sizeBefore || 0) / 1024)}KB)`, 'success');
  } catch (error) {
    showToast('Failed to clear localStorage', 'error');
  }
}

// Clear in-memory cache
function clearCache() {
  try {
    clearMemoryCache();
    clearImageCache();
    showToast('Cleared in-memory cache', 'success');
  } catch (error) {
    showToast('Failed to clear in-memory cache', 'error');
  }
}

// Clear all caches
function clearAllCaches() {
  try {
    clearLocalStorage();
    clearCache();
    showToast('Cleared all caches', 'success');
  } catch (error) {
    showToast('Failed to clear all caches', 'error');
  }
}

// Show cache info
function showCacheInfo() {
  try {
    // Get localStorage size
    const storageSize = getLocalStorageSize();
    
    // Count WebCorner items
    const webcornerItemCount = Object.keys(localStorage).filter(key => 
      key.startsWith('webcorner')
    ).length;
    
    // Show toast with summary
    showToast(`LocalStorage: ${Math.round((storageSize || 0) / 1024)}KB, Items: ${webcornerItemCount}`, 'info');
    
    // Log to console for detail
    console.group('WebCorner Cache Info');
    console.log(`LocalStorage Size: ${Math.round((storageSize || 0) / 1024)}KB`);
    console.log(`WebCorner Items: ${webcornerItemCount}`);
    console.groupEnd();
  } catch (error) {
    showToast('Failed to show cache info', 'error');
  }
}

// Lifecycle hooks
onMounted(() => {
  // Initialize logging state
  loggingEnabled.value = isLoggingEnabled();
  
  // Apply logging setting
  applyLoggingSetting();
  
  // Add keyboard listener
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  // Remove keyboard listener
  window.removeEventListener('keydown', handleKeyDown);
  
  // Restore original console.debug
  console.debug = originalConsoleDebug;
});
</script> 