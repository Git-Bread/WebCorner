<template>  <div class="w-64 bg-surface border-r border-border h-full relative">
    <div class="p-4">
      <!-- If a server is selected, show server info & members -->
      <div v-if="selectedServerId && serverData[selectedServerId]">
        <!-- Invite Creation Section (only for admins/owners) -->
        <ServerInviteManager :server-id="selectedServerId" />
        
        <!-- Server Header with Image and Name -->
        <ServerHeader 
          :server-name="getServerName(selectedServerId)" 
          :server-image-url="getServerImageUrl(selectedServerId)"
        />
        
        <!-- User List Header -->
        <div class="flex items-center justify-between mb-3 mt-6">
          <h3 class="text-sm font-medium text-text-muted uppercase">Members</h3>
          <span class="text-xs text-text-muted">{{ getMemberCount(selectedServerId) }}</span>
        </div>
        
        <!-- Server Members List -->
        <ServerMembersList :server-id="selectedServerId" />
        
        <!-- Back button when viewing server members -->
        <BackToServersButton @back="handleBackToServers" />
      </div>
        <!-- If no server is selected, show server list -->
      <div v-else>
        <!-- Loading overlay when a server is being selected -->
        <div v-if="isSelectingServer" class="absolute inset-0 bg-surface bg-opacity-80 flex items-center justify-center z-10">
          <div class="text-center">
            <div class="w-8 h-8 border-2 border-t-theme-primary rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-text-muted text-sm">Loading server...</p>
          </div>
        </div>
        
        <ServerList 
          :servers="servers" 
          :server-data="serverData" 
          :is-loading="isLoading"
          :selected-server-id="selectedServerId"
          @server-selected="handleServerSelection"
          @add-server="$emit('add-server')"
          @join-server="$emit('join-server')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ServerRef } from '~/schemas/userSchemas';

// Import sidebar components
import ServerInviteManager from './sidebar/ServerInviteManager.vue';
import ServerHeader from './sidebar/ServerHeader.vue';
import ServerMembersList from './sidebar/ServerMembersList.vue';
import BackToServersButton from './sidebar/BackToServersButton.vue';
import ServerList from './sidebar/ServerList.vue';

// Server sidebar props
type ServerSidebarProps = {
  servers: ServerRef[];
  serverData: Record<string, any>;
  isLoading: boolean;
  selectedServerId: string | null;
}

const props = defineProps<ServerSidebarProps>();

// Track server selection state
const isSelectingServer = ref(false);

const emit = defineEmits<{
  (e: 'server-selected', serverId: string | null): void;
  (e: 'add-server'): void;
  (e: 'join-server'): void;
}>();

// Helper functions using props directly
const getServerName = (serverId: string): string => {
  return props.serverData[serverId]?.name || 'Unknown Server';
};

const getServerImageUrl = (serverId: string): string | undefined => {
  return props.serverData[serverId]?.server_img_url || undefined;
};

const getMemberCount = (serverId: string): number => {
  return props.serverData[serverId]?.memberCount || 1;
};

// Handle back to servers button click
const handleBackToServers = () => {
  console.log('Going back to server list - emitting server-selected with null');
  emit('server-selected', null);
};

// Handle server selection with a loading indicator
const handleServerSelection = async (serverId: string) => {
  isSelectingServer.value = true;
  
  // Add a small delay for the animation to be visible
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Emit the server selection event to the parent
  emit('server-selected', serverId);
  
  // Reset the loading state after a short delay
  setTimeout(() => {
    isSelectingServer.value = false;
  }, 200);
};
</script>