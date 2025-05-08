<template>
  <div class="news-component">
    <div class="mb-4 flex justify-between items-center">
      <h4 class="font-medium text-heading">Latest Announcements</h4>
      <button class="text-theme-primary text-sm hover:underline">
        <fa :icon="['fas', 'plus-circle']" class="mr-1" />
        Add Announcement
      </button>
    </div>
    
    <div class="space-y-3">
      <div v-for="i in 3" :key="i" class="bg-background border border-border rounded-md p-3">
        <div class="flex justify-between mb-1">
          <h5 class="font-medium text-heading">Announcement Title</h5>
          <span class="text-text-muted text-xs">{{ new Date().toLocaleDateString() }}</span>
        </div>
        <p class="text-text-muted text-sm">This is a placeholder for announcement content. It would contain actual server announcements when implemented.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// This is a placeholder component for the News/Announcements field
// Will be fully implemented later with actual data and functionality
</script>