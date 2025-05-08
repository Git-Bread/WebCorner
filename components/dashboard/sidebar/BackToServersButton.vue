<template>
  <div class="mt-6 pt-4 border-t border-border">
    <button
      @click="$emit('back')"
      class="w-full text-text-muted hover:text-text flex items-center justify-center p-2 rounded-md bg-surface hover:bg-theme-primary transition-colors duration-300 sidebar-hover-grow"
    >
      <fa :icon="['fas', 'arrow-left']" class="mr-2" />
      Back to servers
    </button>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'back'): void;
}>();
</script>