<template>
  <div class="bg-surface border border-border rounded-lg p-6 mb-6 text-center">
    <div class="mb-4">
      <svg class="mx-auto h-12 w-12 text-text-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
      </svg>
    </div>
    <h2 class="text-xl font-semibold text-heading mb-2">Welcome to WebCorner!</h2>
    <p class="text-text-muted mb-6">You're not connected to any servers yet. Create a new one or join an existing server to get started.</p>
    
    <div class="flex justify-center space-x-4">
      <button @click="$emit('create-server')" class="px-4 py-2 border border-theme-primary text-theme-primary rounded-md cta-button cta-secondary">Create Server</button>
      <button @click="$emit('join-server')" class="px-4 py-2 bg-theme-primary text-background rounded-md cta-button hover-grow">
        Join Server
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'create-server'): void;
  (e: 'join-server'): void;
}>();
</script>