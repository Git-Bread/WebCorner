<template>
  <div class="chat-component flex flex-col h-full">
    <div class="mb-3 pb-3 border-b border-border">
      <div class="flex items-center gap-2">
        <fa :icon="['fas', 'hashtag']" class="text-theme-primary" />
        <h4 class="font-medium text-heading">general</h4>
      </div>
    </div>
    
    <div class="flex-1 overflow-y-auto space-y-4 min-h-[200px]">
      <div v-for="i in 5" :key="i" class="flex gap-3">
        <div class="w-8 h-8 rounded-full bg-theme-primary bg-opacity-20 flex items-center justify-center flex-shrink-0">
          <span class="font-medium text-theme-primary">{{ String.fromCharCode(64 + i) }}</span>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-medium text-heading">User {{ i }}</span>
            <span class="text-xs text-text-muted">{{ new Date().toLocaleTimeString() }}</span>
          </div>
          <p class="text-sm text-text">This is a placeholder message in the chat component.</p>
        </div>
      </div>
    </div>
    
    <div class="mt-3 pt-3 border-t border-border">
      <div class="relative">
        <input 
          type="text" 
          placeholder="Type a message..." 
          class="w-full bg-background border border-border rounded-md py-2 px-4 text-text"
        />
        <button class="absolute right-2 top-1/2 transform -translate-y-1/2 text-theme-primary">
          <fa :icon="['fas', 'paper-plane']" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// This is a placeholder component for the Chat field
// Will be fully implemented later with actual data and functionality
</script>