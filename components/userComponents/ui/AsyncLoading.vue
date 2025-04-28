<template>
  <div class="flex items-center justify-center min-h-[12rem]" role="status" aria-label="Loading content">
    <div class="animate-pulse flex flex-col items-center">
      <div class="h-4 bg-border rounded w-3/4 mb-4"></div>
      <div class="h-4 bg-border rounded w-1/2 mb-4"></div>
      <div class="h-4 bg-border rounded w-2/3"></div>
      <span class="sr-only">Loading...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
// This is a simple loading component for async components
</script>