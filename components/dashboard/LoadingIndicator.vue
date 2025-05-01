<template>
  <div class="bg-surface border border-border rounded-lg p-6 text-center">
    <div class="w-8 h-8 border-2 border-t-theme-primary rounded-full animate-spin mx-auto mb-4"></div>
    <p class="text-text-muted">{{ message || 'Loading...' }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message?: string;
}>();
</script>