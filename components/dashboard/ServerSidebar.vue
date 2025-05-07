<template>
  <div class="w-64 bg-surface border-r border-border h-full">
    <div class="p-4">
      <!-- If a server is selected, show server info & members -->
      <div v-if="selectedServerId && serverData[selectedServerId]">
        <!-- Invite Creation Section (only for admins/owners) -->
        <div v-if="isAdmin" class="mb-4">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-sm font-medium text-text-muted uppercase">Invite Users</h3>
            <button 
              v-if="!showInviteForm" 
              @click="showInviteForm = true" 
              class="text-xs text-theme-primary hover:text-theme-primary-dark"
            >
              + Create Invite
            </button>
          </div>
          
          <!-- Create Invite Form -->
          <div v-if="showInviteForm" class="bg-background p-3 rounded-md mb-2">
            <div class="flex flex-col space-y-2">
              <!-- Max uses input -->
              <div>
                <label class="text-xs text-text-muted block mb-1">Max Uses</label>
                <input 
                  v-model="maxUses" 
                  type="number" 
                  min="1" 
                  class="w-full p-1 text-sm bg-surface border border-border rounded"
                  placeholder="No limit"
                />
              </div>
              
              <!-- Expiration options -->
              <div>
                <label class="text-xs text-text-muted block mb-1">Expires after</label>
                <select 
                  v-model="expiryOption" 
                  class="w-full p-1 text-sm bg-surface border border-border rounded"
                >
                  <option value="1">1 day</option>
                  <option value="2">2 days</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>
              
              <!-- Buttons -->
              <div class="flex justify-between pt-1">
                <button 
                  @click="showInviteForm = false" 
                  class="text-xs text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button 
                  @click="createInvite" 
                  class="text-xs bg-theme-primary hover:bg-theme-primary-dark text-white px-3 py-1 rounded"
                  :disabled="isCreatingInvite"
                >
                  {{ isCreatingInvite ? 'Creating...' : 'Create' }}
                </button>
              </div>
            </div>
          </div>
          
          <!-- Active Invite (show after creation) -->
          <div v-if="currentInviteCode" class="bg-background p-3 rounded-md mb-3">
            <div class="flex flex-col">
              <div class="flex justify-between items-center mb-2">
                <span class="text-xs text-text-muted">Active Invite</span>
                <span class="text-xs text-text-muted">Expires in {{ expiryDisplay }}</span>
              </div>
              
              <div class="flex items-center bg-surface p-2 rounded border border-border">
                <input 
                  ref="inviteCodeInput"
                  type="text" 
                  class="bg-transparent text-text text-sm flex-grow outline-none" 
                  readonly
                  :value="currentInviteCode"
                />
                <button 
                  @click="copyInviteCode" 
                  class="text-theme-primary hover:text-theme-primary-dark ml-2"
                >
                  <fa :icon="['fas', 'copy']" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
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
import { defineProps, defineEmits, ref, computed, watchEffect } from 'vue';
import type { ServerRef } from '~/schemas/userSchemas';
import { showToast } from '~/utils/toast';
import { useServerPermissions, useServerInvitations } from '~/composables/server';

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

// Access server composables
const { isServerAdminOrOwner } = useServerPermissions();
const { generateServerInvite } = useServerInvitations();

// State for invite creation
const showInviteForm = ref(false);
const maxUses = ref<number | null>(null);
const expiryOption = ref('2'); // Default 2 days
const currentInviteCode = ref<string | null>(null);
const inviteCreatedAt = ref<Date | null>(null);
const isCreatingInvite = ref(false);
const isAdmin = ref(false);
const inviteCodeInput = ref<HTMLInputElement | null>(null);

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

const getMemberCount = (serverId: string): number => {
  return props.serverData[serverId]?.memberCount || 1;
};

// Watch for server changes to check admin status
watchEffect(async () => {
  if (props.selectedServerId) {
    isAdmin.value = await isServerAdminOrOwner(props.selectedServerId);
  } else {
    isAdmin.value = false;
  }
});

// Calculate expiry display
const expiryDisplay = computed(() => {
  if (!inviteCreatedAt.value || !expiryOption.value) return '';
  
  const now = new Date();
  const expiryDate = new Date(inviteCreatedAt.value.getTime() + parseInt(expiryOption.value) * 24 * 60 * 60 * 1000);
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays > 0) {
    return `${diffDays}d ${diffHours}h`;
  }
  return `${diffHours}h`;
});

// Create an invite
const createInvite = async () => {
  if (!props.selectedServerId) return;
  
  isCreatingInvite.value = true;
  
  try {
    const expiresInMs = parseInt(expiryOption.value) * 24 * 60 * 60 * 1000;
    const options = {
      expiresInMs,
      ...(maxUses.value && { maxUses: maxUses.value })
    };
    
    const inviteCode = await generateServerInvite(props.selectedServerId, options);
    
    if (inviteCode) {
      currentInviteCode.value = inviteCode;
      inviteCreatedAt.value = new Date();
      showInviteForm.value = false;
    }
  } finally {
    isCreatingInvite.value = false;
  }
};

// Copy invite code to clipboard
const copyInviteCode = () => {
  if (!currentInviteCode.value) return;
  
  // Create temp input to copy from
  const tempInput = document.createElement('input');
  tempInput.value = currentInviteCode.value;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand('copy');
  document.body.removeChild(tempInput);
  
  // Show toast
  showToast('Invite code copied to clipboard', 'success');
};
</script>