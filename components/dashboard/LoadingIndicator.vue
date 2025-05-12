<template>
  <ClientOnly>
    <div class="bg-surface border border-border rounded-lg p-6 text-center">
      <div class="w-10 h-10 border-3 border-t-theme-primary rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-text font-medium mb-2">{{ message || 'Loading...' }}</p>
      <p v-if="detail" class="text-text-muted text-sm mb-3">{{ detail }}</p>
      <div v-if="showProgress" class="w-48 mx-auto bg-background rounded-full h-2 mt-3">
        <div 
          class="bg-theme-primary h-2 rounded-full transition-all duration-300" 
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
defineProps<{
  message?: string;
  detail?: string;
  showProgress?: boolean;
  progress?: number;
}>();
</script>