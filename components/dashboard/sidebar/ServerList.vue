<template>
  <div>
    <h2 class="text-lg font-medium text-heading mb-4">Your Servers</h2>
    
    <!-- Loading indicator -->
    <div v-if="isLoading" class="flex justify-center py-4">
      <div class="w-6 h-6 border-2 border-t-theme-primary rounded-full animate-spin"></div>
    </div>
    
    <div v-else-if="servers && servers.length > 0" class="space-y-2">
      <!-- Server list items -->
      <div 
        v-for="server in servers" 
        :key="server.serverId" 
        class="flex items-center p-2 rounded-md hover:bg-background cursor-pointer"
        @click="$emit('server-selected', server.serverId)"
      >
        <!-- Server Avatar - Image or Fallback Initial -->
        <div 
          class="w-8 h-8 rounded-full flex items-center justify-center mr-2 overflow-hidden"
          :class="getServerImageUrl(server.serverId) ? '' : 'bg-theme-primary text-background'"
        >
          <img 
            v-if="getServerImageUrl(server.serverId)"
            :src="getServerImageUrl(server.serverId) || ''"
            :alt="getServerName(server.serverId)"
            class="w-full h-full object-cover"
          />
          <span v-else>{{ getServerInitial(server.serverId) }}</span>
        </div>
        <span class="text-text truncate">{{ getServerName(server.serverId) }}</span>
      </div>
    </div>
    
    <div v-else class="text-text-muted text-sm py-2">
      No servers joined yet
    </div>
    
    <!-- Add Server Button -->
    <div class="mt-4 pt-4 border-t border-border space-y-2">
      <button 
        @click="$emit('add-server')"
        class="w-full flex items-center justify-center p-2 rounded-md bg-surface hover:bg-background text-text-muted hover:text-text transition-all"
      >
        <fa :icon="['fas', 'plus']" class="mr-2" />
        Create Server
      </button>
      
      <!-- Join Server Button -->
      <button 
        @click="$emit('join-server')"
        class="w-full flex items-center justify-center p-2 rounded-md bg-surface hover:bg-background text-text-muted hover:text-text transition-all"
      >
        <fa :icon="['fas', 'sign-in-alt']" class="mr-2" />
        Join Server
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import type { ServerRef } from '~/schemas/userSchemas';

const props = defineProps<{
  servers: ServerRef[];
  serverData: Record<string, any>;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'server-selected', serverId: string): void;
  (e: 'add-server'): void;
  (e: 'join-server'): void;
}>();

// Helper functions using props directly
const getServerName = (serverId: string): string => {
  return props.serverData[serverId]?.name || 'Unknown Server';
};

const getServerInitial = (serverId: string): string => {
  const name = getServerName(serverId);
  return name.charAt(0).toUpperCase();
};

const getServerImageUrl = (serverId: string): string | undefined => {
  return props.serverData[serverId]?.server_img_url || undefined;
};
</script>