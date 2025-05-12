<template>  <div class="w-64 bg-surface border-r border-border h-full relative">
    <div class="p-4">
      <ClientOnly>
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
          <div v-if="isLoading" class="absolute inset-0 bg-surface bg-opacity-80 flex items-center justify-center z-10">
            <div class="text-center">
              <div class="w-8 h-8 border-2 border-t-theme-primary rounded-full animate-spin mx-auto mb-3"></div>
              <p class="text-text-muted text-sm">Loading server...</p>
            </div>
          </div>
          
          <ServerList 
            :selected-server-id="selectedServerId"
            :user-servers="userServers"
            :server-data="serverData"
            :is-loading="isLoading"
            @server-selected="handleServerSelection"
            @add-server="$emit('add-server')"
            @join-server="$emit('join-server')"
          />
        </div>
      </ClientOnly>
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

// Import server image cache utility
import { serverImageCache } from '~/utils/storageUtils/imageCacheUtil';
import { showToast } from '~/utils/toast';

// Define props and emits
const props = defineProps<{
  selectedServerId: string | null;
  // Inherit server data from parent to avoid duplicate fetching
  serverData: Record<string, any>;
  userServers: any[];
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'server-selected', serverId: string | null): void;
  (e: 'add-server'): void;
  (e: 'join-server'): void;
}>();

// Track server selection state
const isSelectingServer = ref(false);

// Helper functions that use the passed data directly
const getServerName = (serverId: string): string => {
  return props.serverData[serverId]?.name || 'Unknown Server';
};

const getServerImageUrl = (serverId: string): string | undefined => {
  if (!serverId || !props.serverData) return undefined;
  
  const server = props.serverData[serverId];
  if (!server) return undefined;
  
  // Use the serverImageCache utility to get cached image URL
  return server.server_img_url ? serverImageCache.getServerImage(server.server_img_url) : undefined;
};

const getMemberCount = (serverId: string): number => {
  return props.serverData[serverId]?.memberCount || 1;
};

// Handle back to servers button click
const handleBackToServers = () => {
  emit('server-selected', null);
};

// Handle server selection with a loading indicator
const handleServerSelection = async (serverId: string) => {
  if (isSelectingServer.value) return; // Prevent multiple concurrent selections
  
  isSelectingServer.value = true;
  
  try {
    // Emit the server selection event to the parent
    emit('server-selected', serverId);
  } catch (error) {
    console.error('Error selecting server:', error);
    showToast('Error selecting server', 'error');
  } finally {
    // Reset the loading state after a short delay for better UX
    setTimeout(() => {
      isSelectingServer.value = false;
    }, 200);
  }
};
</script>