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
        <h3 class="text-xl text-heading mb-4 font-semibold">Welcome to WebCorner!</h3>
        <div class="bg-background p-4 border border-border rounded-md">
          <h4 class="font-medium text-theme-primary mb-3">Getting Started</h4>
          <ul class="space-y-3 text-text">
            <li class="flex items-start">
              <fa :icon="['fas', 'plus-circle']" class="text-theme-primary mr-2 mt-1 flex-shrink-0" />
              <span><strong>Create a Server</strong> - Start your own collaborative workspace by clicking "Create Server" in the sidebar.</span>
            </li>
            <li class="flex items-start">
              <fa :icon="['fas', 'sign-in-alt']" class="text-theme-primary mr-2 mt-1 flex-shrink-0" />
              <span><strong>Join a Server</strong> - Connect to an existing server using an invitation code or server ID by clicking "Join Server".</span>
            </li>
            <li class="flex items-start">
              <fa :icon="['fas', 'users']" class="text-theme-primary mr-2 mt-1 flex-shrink-0" />
              <span><strong>Invite Team Members</strong> - Once in a server, you can invite colleagues to collaborate with you.</span>
            </li>
          </ul>
        </div>
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