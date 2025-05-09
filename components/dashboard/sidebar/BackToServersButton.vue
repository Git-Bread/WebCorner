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
import { clearLastSelectedServer } from '~/utils/serverStorageUtils';

const { user } = useAuth();
const isNavigating = ref(false);

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const handleBackClick = async () => {
  isNavigating.value = true;
  
  if (user.value) {
    clearLastSelectedServer(user.value.uid);
  }
  
  // Add a small delay to show the animation
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Emit back event
  emit('back');
  
  // Reset the state after a short delay
  setTimeout(() => {
    isNavigating.value = false;
  }, 200);
};
</script>