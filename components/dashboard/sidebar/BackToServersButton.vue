<template>  <div class="mt-6 pt-4 border-t border-border">
    <button @click="handleBackClick"
           :disabled="isNavigating"
           class="w-full text-text-muted hover:text-text flex items-center justify-center p-2 rounded-md bg-surface hover:bg-theme-primary transition-colors duration-300 sidebar-hover-grow"
           aria-label="Back to servers list">
      <span v-if="isNavigating" class="w-4 h-4 border-2 border-t-transparent border-text-muted rounded-full animate-spin mr-2"></span>
      <fa v-else :icon="['fas', 'arrow-left']" class="mr-2" />
      {{ isNavigating ? 'Going back...' : 'Back to servers' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const isNavigating = ref(false);

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const handleBackClick = async () => {
  isNavigating.value = true;
  
  try {
    // Simulate a slight delay for the loading animation
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Emit event to parent component
    emit('back');
  } catch (error) {
    // Handle any errors silently
    console.error('Error navigating back:', error);
  } finally {
    isNavigating.value = false;
  }
};
</script>