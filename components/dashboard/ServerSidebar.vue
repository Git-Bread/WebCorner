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

// Import sidebar components
import ServerInviteManager from './sidebar/ServerInviteManager.vue';
import ServerHeader from './sidebar/ServerHeader.vue';
import ServerMembersList from './sidebar/ServerMembersList.vue';
import BackToServersButton from './sidebar/BackToServersButton.vue';
import ServerList from './sidebar/ServerList.vue';

// Import server composables for direct access
import { useServerCore } from '~/composables/server';
import { serverImageCache } from '~/utils/storageUtils/imageCacheUtil';

// Define props and emits
const props = defineProps<{
  selectedServerId: string | null;
}>();

const emit = defineEmits<{
  (e: 'server-selected', serverId: string | null): void;
  (e: 'add-server'): void;
  (e: 'join-server'): void;
}>();

// Use server composables directly
const { serverData } = useServerCore();

// Track server selection state
const isSelectingServer = ref(false);

// Helper functions that now use the composable data directly
const getServerName = (serverId: string): string => {
  return serverData.value[serverId]?.name || 'Unknown Server';
};

const getServerImageUrl = (serverId: string): string | undefined => {
  if (!serverId || !serverData.value) return undefined;
  
  const server = serverData.value[serverId];
  if (!server) return undefined;
  
  // Use the serverImageCache utility to get cached image URL
  return server.server_img_url ? serverImageCache.getServerImage(server.server_img_url) : undefined;
};

const getMemberCount = (serverId: string): number => {
  return serverData.value[serverId]?.memberCount || 1;
};

// Handle back to servers button click
const handleBackToServers = () => {
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