<template>
  <div class="w-64 bg-surface border-r border-border h-full">
    <div class="p-4">
      <!-- If a server is selected, show server info & members -->
      <div v-if="selectedServerId && serverData[selectedServerId]">
        <!-- Server Image - Rectangular size -->
        <div class="flex flex-col items-center mb-4">
          <div 
            class="w-full h-32 rounded-lg flex items-center justify-center overflow-hidden mb-2"
            :class="getServerImageUrl(selectedServerId) ? 'border border-border' : 'bg-theme-primary text-background'"
          >
            <img 
              v-if="getServerImageUrl(selectedServerId)"
              :src="getServerImageUrl(selectedServerId) || ''"
              :alt="getServerName(selectedServerId)"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-2xl font-bold">{{ getServerInitial(selectedServerId) }}</span>
          </div>
          
          <!-- Underline -->
          <div class="w-3/4 border-b border-border"></div>
          
          <!-- Server Name -->
          <h2 class="text-lg font-medium text-heading mt-2">{{ getServerName(selectedServerId) }}</h2>
        </div>
        
        <!-- User List Header -->
        <div class="flex items-center justify-between mb-3 mt-6">
          <h3 class="text-sm font-medium text-text-muted uppercase">Members</h3>
          <span class="text-xs text-text-muted">{{ getMemberCount(selectedServerId) }}</span>
        </div>
        
        <!-- User list - placeholder for now -->
        <div class="space-y-2 max-h-64 overflow-y-auto">
          <!-- Server member items -->
          <div
            v-for="i in 5" 
            :key="i" 
            class="flex items-center p-2 rounded-md hover:bg-background"
          >
            <div class="w-8 h-8 rounded-full bg-gray-300 mr-2"></div>
            <span class="text-text truncate">Member {{ i }}</span>
          </div>
        </div>
        
        <!-- Back button when viewing server members -->
        <div class="mt-6 pt-4 border-t border-border">
          <button
            @click="$emit('server-selected', null)"
            class="w-full text-text-muted hover:text-text flex items-center justify-center p-2 rounded-md bg-surface hover:bg-background transition-all"
          >
            <fa :icon="['fas', 'arrow-left']" class="mr-2" />
            Back to servers
          </button>
        </div>
      </div>
      
      <!-- If no server is selected, show server list -->
      <div v-else>
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
        <div class="mt-4 pt-4 border-t border-border">
          <button 
            @click="$emit('add-server')"
            class="w-full flex items-center justify-center p-2 rounded-md bg-surface hover:bg-background text-text-muted hover:text-text transition-all"
          >
            <fa :icon="['fas', 'plus']" class="mr-2" />
            Add Server
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import type { ServerRef } from '~/schemas/userSchemas';

// Server sidebar props
type ServerSidebarProps = {
  servers: ServerRef[];
  serverData: Record<string, any>;
  isLoading: boolean;
  selectedServerId: string | null;
}

const props = defineProps<ServerSidebarProps>();

defineEmits<{
  (e: 'server-selected', serverId: string | null): void;
  (e: 'add-server'): void;
}>();

// Helper functions for displaying server info
const getServerName = (serverId: string): string => {
  return props.serverData[serverId]?.name || 'Unknown Server';
};

const getServerInitial = (serverId: string): string => {
  const name = getServerName(serverId);
  return name.charAt(0).toUpperCase();
};

// Helper function to get the server image URL
const getServerImageUrl = (serverId: string): string | undefined => {
  return props.serverData[serverId]?.server_img_url || undefined;
};

// Helper function to get the member count
const getMemberCount = (serverId: string): number => {
  return props.serverData[serverId]?.memberCount || 1;
};
</script>