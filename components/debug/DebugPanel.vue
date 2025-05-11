<template>
  <div v-if="debugEnabled" class="fixed bottom-0 left-0 z-50 bg-background border border-border rounded-tr-lg shadow-lg p-4 max-w-[270px] text-sm" v-show="showPanel">
    <!-- Header section -->
    <div class="items-center mb-3">
      <h3 class="font-extrabold text-heading">Debug Panel</h3>
      <div class="w-full mt-1">
        <button @click="toggleLogging" class="p-1 mr-1 rounded-md" :class="loggingEnabled ? 'bg-theme-primary text-background' : 'bg-surface text-text-muted border border-border'" title="Toggle console logging">
          <span>Logging</span>
        </button>
        <button @click="toggleDebugMode" class="p-1 rounded-md text-background" :class="debugEnabled ? 'bg-theme-primary' : 'bg-error'" title="Toggle debug mode">
          <span>{{ debugEnabled ? 'On' : 'Off' }}</span>
        </button>
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
        <button @click="clearBothCaches" class="py-2 px-3 bg-error text-background rounded-md hover:bg-error/90 transition-all flex items-center justify-center" title="Clear all caches">
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
  
  <!-- Minimal button when debug panel is hidden -->
  <div v-else-if="debugEnabled && !showPanel" class="fixed bottom-0 left-0 z-50">
    <button @click="showPanel = true" class="px-3 py-2 text-xs font-medium bg-background border-t border-r border-border text-text rounded-tr-md hover:bg-surface transition-colors" title="Show debug panel">
      <fa :icon="['fas', 'bug']" class="mr-1" aria-hidden="true" />
      Debug
    </button>
  </div>
  
  <!-- Always render in development, hidden in production unless enabled -->
  <div v-else-if="!debugEnabled && isDevelopment" class="fixed bottom-0 left-0 z-50">
    <button @click="enableDebugMode" class="px-3 py-2 text-xs font-medium bg-background border-t border-r border-border text-text-muted rounded-tr-md opacity-50 hover:opacity-100 hover:bg-surface transition-colors" title="Enable debug mode">
      <fa :icon="['fas', 'bug']" class="mr-1" aria-hidden="true" />
      Debug
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { clearAllApplicationStorage, getLocalStorageSize } from '~/utils/storageUtils/localStorageUtil';
import { clearCache as clearMemoryCache, cleanExpiredCacheItems } from '~/utils/storageUtils/cacheUtil';
import { clearImageCache } from '~/utils/storageUtils/imageCacheUtil';
import { showToast } from '~/utils/toast';
import { isDebugMode as checkDebugMode, setDebugMode, IS_DEVELOPMENT, isLoggingEnabled as checkLoggingEnabled } from '~/utils/debugUtils';

// Keep a reference to the original console methods
const originalConsoleDebug = console.debug;

// Check environment
const isDevelopment = IS_DEVELOPMENT;

// Reactive state
const showPanel = ref(false);
const debugEnabled = ref(false);
const loggingEnabled = ref(true);

// Update debug state based on settings
const updateDebugState = () => {
  debugEnabled.value = checkDebugMode();
  loggingEnabled.value = checkLoggingEnabled();
  
  // Apply logging state immediately
  applyLoggingState();
};

// Apply current logging state to console
const applyLoggingState = () => {
  if (!loggingEnabled.value) {
    console.debug = () => {}; // Replace with empty function
  } else {
    console.debug = originalConsoleDebug; // Restore original implementation
  }
};

// Toggle console logging
const toggleLogging = () => {
  loggingEnabled.value = !loggingEnabled.value;
  
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('webcorner_logging_enabled', loggingEnabled.value ? 'true' : 'false');
  }
  
  // Apply the new state
  applyLoggingState();
  
  showToast(`Console logging ${loggingEnabled.value ? 'enabled' : 'disabled'}`, 'info');
};

// Toggle debug mode
const toggleDebugMode = () => {
  setDebugMode(!debugEnabled.value);
  updateDebugState();
  
  if (debugEnabled.value) {
    showToast('Debug mode enabled', 'info');
  } else {
    showToast('Debug mode disabled', 'info');
    showPanel.value = false;  // Hide panel when disabling debug mode
  }
};

// Enable debug mode
const enableDebugMode = () => {
  setDebugMode(true);
  updateDebugState();
  showPanel.value = true;
  showToast('Debug mode enabled', 'info');
};

// Toggle panel visibility
const togglePanel = (event: KeyboardEvent) => {
  // Only respond to keyboard shortcut if debug is enabled
  if (event.altKey && event.key === 'd') {
    if (debugEnabled.value) {
      showPanel.value = !showPanel.value;
      
      if (showPanel.value) {
        showToast('Debug panel opened', 'info');
      }
    } else if (isDevelopment) {
      // In development, allow enabling debug mode with Alt+D
      enableDebugMode();
    }
  }
};

// Clear localStorage
const clearLocalStorage = () => {
  try {
    // Get size before clearing for reporting
    const sizeBefore = getLocalStorageSize();
    
    // Clear all webcorner localStorage items
    clearAllApplicationStorage('webcorner');
    
    showToast(`Cleared localStorage (${Math.round((sizeBefore || 0) / 1024)}KB)`, 'success');
    console.log('[Debug] Cleared localStorage');
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    showToast('Failed to clear localStorage', 'error');
  }
};

// Clear in-memory cache only
const clearCache = () => {
  try {
    // Clear all in-memory caches
    clearMemoryCache();  // Memory cache
    clearImageCache();  // Image cache
    
    showToast('Cleared in-memory cache', 'success');
    console.log('[Debug] Cleared in-memory cache');
  } catch (error) {
    console.error('Error clearing in-memory cache:', error);
    showToast('Failed to clear in-memory cache', 'error');
  }
};

// Clear both in-memory cache and localStorage
const clearBothCaches = () => {
  try {
    // Get size before clearing for reporting
    const sizeBefore = getLocalStorageSize();
    
    // Clear both caches
    clearMemoryCache(); // Memory cache
    clearImageCache();  // Image cache
    clearAllApplicationStorage('webcorner'); // localStorage 
    
    showToast(`Cleared all caches (${Math.round((sizeBefore || 0) / 1024)}KB)`, 'success');
    console.log('[Debug] Cleared all caches');
  } catch (error) {
    console.error('Error clearing all caches:', error);
    showToast('Failed to clear all caches', 'error');
  }
};

// Show cache info in console
const showCacheInfo = () => {
  try {
    // Clean expired cache items and get count
    const removedCount = cleanExpiredCacheItems();
    
    // Get localStorage size
    const storageSize = getLocalStorageSize();
    
    // Get localStorage items count with webcorner prefix
    const webcornerItemCount = Object.keys(localStorage).filter(key => 
      key.startsWith('webcorner')
    ).length;
    
    // Log information
    console.group('Cache Debug Information');
    console.log(`LocalStorage Size: ${Math.round((storageSize || 0) / 1024)}KB`);
    console.log(`WebCorner Items: ${webcornerItemCount}`);
    console.log(`Expired Items Cleaned: ${removedCount}`);
    
    // List all webcorner keys in localStorage
    console.group('WebCorner LocalStorage Keys');
    Object.keys(localStorage)
      .filter(key => key.startsWith('webcorner'))
      .forEach(key => {
        const item = localStorage.getItem(key);
        console.log(`${key}: ${item?.length} chars`);
      });
    console.groupEnd();
    console.groupEnd();
    
    showToast('Cache info logged to console', 'info');
  } catch (error) {
    console.error('Error showing cache info:', error);
    showToast('Failed to show cache info', 'error');
  }
};

// Add event listeners on mount
onMounted(() => {
  updateDebugState();
  window.addEventListener('keydown', togglePanel);
});

// Remove event listeners and restore console on unmount
onUnmounted(() => {
  window.removeEventListener('keydown', togglePanel);
  
  // Restore original console.debug when component is unmounted
  console.debug = originalConsoleDebug;
});
</script> 