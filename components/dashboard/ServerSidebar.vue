<template>
  <div class="w-64 bg-surface border-r border-border h-full">
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
      <ServerList 
        v-else
        :servers="servers" 
        :server-data="serverData" 
        :is-loading="isLoading"
        @server-selected="$emit('server-selected', $event)"
        @add-server="$emit('add-server')"
        @join-server="$emit('join-server')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
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
  emit('server-selected', null);
};
</script>