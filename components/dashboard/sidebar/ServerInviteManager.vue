<template>
  <div v-if="isAdmin" class="mb-4">
    <div class="flex justify-between items-center mb-2">
      <h3 class="text-sm font-medium text-text-muted uppercase">Invite Users</h3>
      <button 
        v-if="!showInviteForm" 
        @click="showInviteFormAndLoadInvites" 
        class="text-xs text-text hover:text-theme-primary sidebar-hover-grow"
      >
        + Create Invite
      </button>
      <button 
        v-else
        @click="showInviteForm = false" 
        class="text-xs text-text hover:text-theme-primary sidebar-hover-grow"
        title="Close invite form"
      >
        <fa :icon="['fas', 'times']" />
      </button>
    </div>
    
    <!-- Create Invite Form with smooth height transition container -->
    <div class="invite-form-container" :class="{ 'open': showInviteForm }">
      <div v-if="showInviteForm" class="bg-background p-3 rounded-md mb-2 border-b-2 border-border invite-form-fade-in">
        <div class="flex flex-col space-y-2">
          <!-- Max uses input -->
          <div>
            <label class="text-xs text-text-muted block mb-1">Max Uses</label>
            <input 
              v-model="maxUses" 
              type="number" 
              min="1" 
              class="w-full text-text p-1 text-sm bg-surface border border-border rounded"
              placeholder="No limit"
            />
          </div>
          
          <!-- Expiration options -->
          <div>
            <label class="text-xs text-text-muted block mb-1">Expires after</label>
            <select 
              v-model="expiryOption" 
              class="w-full p-1 text-sm text-text bg-surface border border-border rounded"
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
              class="text-xs text-text-muted hover:text-error transition-colors duration-300"
            >
              Cancel
            </button>
            <button 
              @click="createInvite" 
              class="text-xs bg-theme-primary hover:bg-theme-secondary text-text px-3 py-1 rounded transition-colors duration-300"
              :disabled="isCreatingInvite"
            >
              {{ isCreatingInvite ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Active Invites Section -->
    <div v-if="showInviteForm && isLoadingInvites" class="flex justify-center py-2">
      <div class="w-4 h-4 border-2 border-t-theme-primary rounded-full animate-spin"></div>
    </div>
    
    <!-- Always show the header with toggle when there are active invites -->
    <div v-if="activeInvites.length > 0" class="mt-3">
      <div class="flex justify-between items-center mb-2">
        <h4 class="text-xs font-medium text-text-muted">Active Invites</h4>
        <div class="flex items-center">
          <input 
            type="checkbox" 
            id="hideInvitesCheckbox" 
            v-model="hideActiveInvites" 
            class="mr-1.5 cursor-pointer"
          />
          <label for="hideInvitesCheckbox" class="text-xs text-text-muted cursor-pointer">
             Hide
          </label>
        </div>
      </div>
      
      <!-- Only hide the actual invite list when hideActiveInvites is true -->
      <div v-if="!hideActiveInvites">
        <div v-for="invite in activeInvites" :key="invite.code" 
          class="bg-background p-3 rounded-md mb-2">
          <div class="flex flex-col">
            <div class="flex justify-between items-center mb-2">
              <span class="text-xs text-text font-medium">
                {{ invite.maxUses ? `${invite.useCount}/${invite.maxUses} uses` : 'Unlimited uses' }}
              </span>
              <span class="text-xs text-text-muted">
                Expires {{ formatExpiryDate(invite.expiresAt) }}
              </span>
            </div>
            
            <div class="flex items-center bg-surface p-2 rounded border border-border">
              <input 
                type="text" 
                class="bg-transparent text-text text-sm flex-grow outline-none" 
                readonly
                :value="invite.code"
              />
              <button 
                @click="copyInviteCode(invite.code)" 
                class="text-theme-primary hover:text-theme-primary-dark"
                title="Copy invite code"
              >
                <fa :icon="['fas', 'copy']" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Recently created invite container with smooth height transition -->
    <div 
      class="invite-form-container"
      :class="{ 'open': currentInviteCode && !showInviteForm && !activeInvites.some(invite => invite.code === currentInviteCode) }"
    >
      <div 
        v-if="currentInviteCode && !showInviteForm && !activeInvites.some(invite => invite.code === currentInviteCode)" 
        class="bg-background p-3 rounded-md mb-3 invite-form-fade-in"
      >
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
              @click="copyInviteCode(currentInviteCode)" 
              class="text-theme-primary hover:text-theme-primary-dark ml-2"
            >
              <fa :icon="['fas', 'copy']" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, defineProps } from 'vue';
import { showToast } from '~/utils/toast';
import { useServerPermissions, useServerInvitations } from '~/composables/server';

const props = defineProps<{
  serverId: string;
}>();

// Access server composables
const { isServerAdminOrOwner } = useServerPermissions();
const { generateServerInvite, loadServerInvites, activeInvites, isLoadingInvites, clearActiveInvites } = useServerInvitations();

// State
const showInviteForm = ref(false);
const maxUses = ref<number | null>(null);
const expiryOption = ref('2'); // Default 2 days
const currentInviteCode = ref<string | null>(null);
const inviteCreatedAt = ref<Date | null>(null);
const isCreatingInvite = ref(false);
const isAdmin = ref(false);
const inviteCodeInput = ref<HTMLInputElement | null>(null);
const hideActiveInvites = ref(false);

// Watch for server changes to check admin status
watchEffect(async () => {
  if (props.serverId) {
    isAdmin.value = await isServerAdminOrOwner(props.serverId);
  } else {
    isAdmin.value = false;
  }
});

// Format expiry date for display
const formatExpiryDate = (date: Date): string => {
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays > 0) {
    return `in ${diffDays}d ${diffHours}h`;
  }
  return `in ${diffHours}h`;
};

// Calculate expiry display for the latest created invite
const expiryDisplay = computed(() => {
  if (!inviteCreatedAt.value || !expiryOption.value) return '';
  
  const now = new Date();
  const expiryDate = new Date(inviteCreatedAt.value.getTime() + parseInt(expiryOption.value) * 24 * 60 * 60 * 1000);
  return formatExpiryDate(expiryDate);
});

// Show form and load active invites
const showInviteFormAndLoadInvites = async () => {
  showInviteForm.value = true;
  
  if (props.serverId) {
    await loadServerInvites(props.serverId);
  }
};

// Create an invite
const createInvite = async () => {
  if (!props.serverId) return;
  
  isCreatingInvite.value = true;
  
  try {
    const expiresInMs = parseInt(expiryOption.value) * 24 * 60 * 60 * 1000;
    const options = {
      expiresInMs,
      ...(maxUses.value && { maxUses: maxUses.value })
    };
    
    const inviteCode = await generateServerInvite(props.serverId, options);
    
    if (inviteCode) {
      currentInviteCode.value = inviteCode;
      inviteCreatedAt.value = new Date();
      showInviteForm.value = false;
      
      // Reload the invite list after creating a new one
      await loadServerInvites(props.serverId);
    }
  } finally {
    isCreatingInvite.value = false;
  }
};

// Copy invite code to clipboard
const copyInviteCode = (code: string) => {
  if (!code) return;
  
  // Create temp input to copy from
  const tempInput = document.createElement('input');
  tempInput.value = code;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand('copy');
  document.body.removeChild(tempInput);
  
  // Show toast
  showToast('Invite code copied to clipboard', 'success');
};

// Reset when switching servers
watchEffect(() => {
  if (!props.serverId) {
    clearActiveInvites();
    currentInviteCode.value = null;
    showInviteForm.value = false;
  }
});
</script>