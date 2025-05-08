<template>
  <div class="activity-component">
    <div class="mb-4 flex justify-between items-center">
      <h4 class="font-medium text-heading">Recent Activity</h4>
      <div class="text-sm">
        <select class="bg-background border border-border rounded px-2 py-1 text-sm text-text">
          <option>All Activity</option>
          <option>Comments</option>
          <option>Members</option>
          <option>Files</option>
        </select>
      </div>
    </div>
    
    <div class="space-y-3">
      <div v-for="i in 4" :key="i" class="flex items-start gap-3 pb-3 border-b border-border">
        <div class="bg-theme-primary bg-opacity-20 rounded-full p-2 flex-shrink-0">
          <fa :icon="['fas', i % 2 === 0 ? 'user-plus' : 'comment']" class="text-theme-primary text-sm" />
        </div>
        <div>
          <p class="text-sm text-text">
            <span class="font-medium">User Name</span> 
            {{ i % 2 === 0 ? 'joined the server' : 'commented on a post' }}
          </p>
          <span class="text-xs text-text-muted">{{ new Date().toLocaleTimeString() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// This is a placeholder component for the Server Activity field
// Will be fully implemented later with actual data and functionality
</script>