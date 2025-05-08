<template>
  <div class="mt-6 pt-4 border-t border-border">
    <button
      @click="handleBackClick"
      class="w-full text-text-muted hover:text-text flex items-center justify-center p-2 rounded-md bg-surface hover:bg-theme-primary transition-colors duration-300 sidebar-hover-grow"
    >
      <fa :icon="['fas', 'arrow-left']" class="mr-2" />
      Back to servers
    </button>
  </div>
</template>

<script setup lang="ts">
import { clearLastSelectedServer } from '~/utils/serverStorageUtils';

const { user } = useAuth();

const emit = defineEmits<{
  (e: 'back'): void;
}>();

/**
 * Handle the back button click
 * - Clear the selected server from localStorage
 * - Emit the back event to notify parent components
 */
const handleBackClick = () => {
  // Clear localStorage if user is authenticated
  if (user.value) {
    clearLastSelectedServer(user.value.uid);
  }
  
  // Notify parent component
  emit('back');
};
</script>