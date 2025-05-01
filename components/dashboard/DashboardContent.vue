<template>
  <div>
    <!-- Main Content Area -->
    <div class="bg-surface border border-border rounded-lg p-6">
      <div v-if="selectedServerId && serverData[selectedServerId]">
        <!-- Server Features/Components will be displayed here -->
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-heading mb-4">Server Features</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- News Component -->
            <div 
              v-if="serverData[selectedServerId]?.components?.news" 
              class="p-4 bg-background border border-border rounded-md"
            >
              <div class="flex items-center mb-3">
                <fa :icon="['fas', 'newspaper']" class="text-theme-primary mr-2" />
                <h3 class="font-medium text-heading">News & Announcements</h3>
              </div>
              <p class="text-text-muted text-sm">Post announcements and updates for all members to see.</p>
            </div>
            
            <!-- Groups Component -->
            <div 
              v-if="serverData[selectedServerId]?.components?.groups" 
              class="p-4 bg-background border border-border rounded-md"
            >
              <div class="flex items-center mb-3">
                <fa :icon="['fas', 'users']" class="text-theme-primary mr-2" />
                <h3 class="font-medium text-heading">Member Groups</h3>
              </div>
              <p class="text-text-muted text-sm">Organize members into different groups with custom permissions.</p>
            </div>
            
            <!-- Chat Component -->
            <div 
              v-if="serverData[selectedServerId]?.components?.chat" 
              class="p-4 bg-background border border-border rounded-md"
            >
              <div class="flex items-center mb-3">
                <fa :icon="['fas', 'comment-dots']" class="text-theme-primary mr-2" />
                <h3 class="font-medium text-heading">Chat</h3>
              </div>
              <p class="text-text-muted text-sm">Real-time messaging for all server members.</p>
            </div>
          </div>
        </div>
        
        <div>
          <h2 class="text-xl font-semibold text-heading mb-4">Server Activity</h2>
          <div class="p-4 border border-border rounded-md bg-background flex items-center justify-center h-48 text-text-muted">
            <div class="text-center">
              <fa :icon="['far', 'chart-bar']" class="text-4xl mb-2" />
              <p>Server activity tracking coming soon</p>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else>
        <h3 class="text-lg text-heading mb-3">Getting Started</h3>
        <ul class="space-y-2 text-text-muted">
          <li class="flex items-start">
            <fa :icon="['fas', 'arrow-right']" class="text-theme-primary mr-2 mt-1" />
            <span>Create a new server by clicking the "Add Server" button in the sidebar</span>
          </li>
          <li class="flex items-start">
            <fa :icon="['fas', 'arrow-right']" class="text-theme-primary mr-2 mt-1" />
            <span>Invite members to your server to start collaborating</span>
          </li>
          <li class="flex items-start">
            <fa :icon="['fas', 'arrow-right']" class="text-theme-primary mr-2 mt-1" />
            <span>Customize your server settings to match your team's needs</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';

const props = defineProps<{
  selectedServerId: string | null;
  serverData: Record<string, any>;
}>();
</script>