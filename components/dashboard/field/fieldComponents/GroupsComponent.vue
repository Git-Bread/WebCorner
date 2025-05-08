<template>
  <div class="groups-component">
    <div class="mb-4 flex justify-between items-center">
      <h4 class="font-medium text-heading">Member Groups</h4>
      <button class="text-theme-primary text-sm hover:underline">
        <fa :icon="['fas', 'plus-circle']" class="mr-1" />
        New Group
      </button>
    </div>
    
    <div class="space-y-3">
      <div v-for="(group, i) in sampleGroups" :key="i" class="bg-background border border-border rounded-md p-3">
        <div class="flex justify-between items-center mb-2">
          <div class="flex items-center">
            <div class="w-3 h-3 rounded-full mr-2" :style="`background-color: ${group.color}`"></div>
            <h5 class="font-medium text-heading">{{ group.name }}</h5>
          </div>
          <span class="bg-surface px-2 py-1 text-xs rounded text-text-muted">{{ group.members }} members</span>
        </div>
        <p class="text-text-muted text-xs">{{ group.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// This is a placeholder component for the Member Groups field
// Will be fully implemented later with actual data and functionality

const sampleGroups = [
  {
    name: 'Administrators',
    description: 'Server owners and administrators with full access',
    members: 2,
    color: '#FF5757'
  },
  {
    name: 'Moderators',
    description: 'Members who help manage the community',
    members: 5,
    color: '#5B8BF5'
  },
  {
    name: 'Members',
    description: 'Regular server members',
    members: 24,
    color: '#4CAF50'
  }
];
</script>