<template>
  <div>
    <h2 class="text-lg font-medium text-heading mb-4">Your Servers</h2>
    
    <!-- Loading indicator -->
    <ClientOnly>
      <div v-if="isLoading" class="flex justify-center py-4">
        <div class="w-6 h-6 border-2 border-t-theme-primary rounded-full animate-spin" aria-label="Loading servers"></div>
      </div>
      
      <div v-else-if="userServers && userServers.length > 0" class="space-y-2">
        <!-- Server list items -->
        <div 
          v-for="server in userServers" 
          :key="server.serverId" 
          class="flex items-center p-2 rounded-md hover:bg-background cursor-pointer"
          :class="{'bg-background border border-theme-primary': selectedServerId === server.serverId}"
          @click="$emit('server-selected', server.serverId)"
          role="button"
          :aria-label="`Select server ${getServerName(server.serverId)}`"
        >
          <!-- Server Avatar - Image or Fallback Initial -->
          <div 
            class="w-8 h-8 rounded-full flex items-center justify-center mr-2 overflow-hidden"
            :class="getServerImageUrl(server.serverId) ? '' : 'bg-theme-primary text-background'"
          >
            <img 
              v-if="getServerImageUrl(server.serverId)"
              :src="getServerImageUrl(server.serverId)"
              :alt="getServerName(server.serverId)"
              class="w-full h-full object-cover"
            />
            <span v-else>{{ getServerInitial(server.serverId) }}</span>
          </div>
          <span class="text-text truncate">{{ getServerName(server.serverId) }}</span>
        </div>
      </div>
      
      <div v-else class="flex justify-center py-4">
        <span class="text-text-muted text-sm">No servers joined yet</span>
      </div>
    </ClientOnly>
    
    <!-- Add Server Button -->
    <div class="mt-4 pt-4 border-t border-border space-y-2">
      <button 
        @click="$emit('add-server')"
        class="w-full flex items-center justify-center p-2 rounded-md bg-surface hover:bg-background text-text-muted hover:text-text transition-all cta-button hover-grow"
        aria-label="Create a new server"
      >
        <fa :icon="['fas', 'plus']" class="mr-2" />
        Create Server
      </button>
      
      <!-- Join Server Button -->
      <button 
        @click="$emit('join-server')"
        class="w-full flex items-center justify-center p-2 rounded-md bg-surface hover:bg-background text-text-muted hover:text-text transition-all cta-button"
        aria-label="Join an existing server"
      >
        <fa :icon="['fas', 'sign-in-alt']" class="mr-2" />
        Join Server
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useServerCore } from '~/composables/server';
import { serverImageCache } from '~/utils/storageUtils/imageCacheUtil';

// External props we need to keep for integration
const props = defineProps<{
  selectedServerId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'server-selected', serverId: string): void;
  (e: 'add-server'): void;
  (e: 'join-server'): void;
}>();

// Use server composables directly
const { userServers, serverData, isLoading } = useServerCore();

// Helper functions using composable data directly
const getServerName = (serverId: string): string => {
  if (!serverData.value[serverId]) {
    console.warn(`Server data missing for ${serverId} in ServerList component, using fallback name`);
    return 'Loading server...';
  }
  return serverData.value[serverId]?.name || 'Unknown Server';
};

const getServerInitial = (serverId: string): string => {
  const name = getServerName(serverId);
  return name.charAt(0).toUpperCase();
};

const getServerImageUrl = (serverId: string): string | undefined => {
  if (!serverId || !serverData.value) return undefined;
  
  const server = serverData.value[serverId];
  if (!server) return undefined;
  
  // Use the serverImageCache utility to get cached image URL
  return server.server_img_url ? serverImageCache.getServerImage(server.server_img_url) : undefined;
};
</script>