<template>
  <div v-if="isAdmin" class="mb-4">
    <div class="flex justify-between items-center mb-2">
      <h3 class="text-sm font-medium text-text-muted uppercase">Invite Users</h3>
      <button v-if="!showInviteForm" 
             @click="showInviteFormAndLoadInvites" 
             class="text-xs text-text hover:text-theme-primary sidebar-hover-grow"
             aria-label="Create invite">
        + Create Invite
      </button>
      <button v-else
             @click="showInviteForm = false" 
             class="text-xs text-text hover:text-theme-primary sidebar-hover-grow"
             title="Close invite form"
             aria-label="Close invite form">
        <fa :icon="['fas', 'times']" />
      </button>
    </div>
    
    <div class="invite-form-container" :class="{ 'open': showInviteForm }">
      <div v-if="showInviteForm" class="bg-background p-3 rounded-md mb-2 border-b-2 border-border invite-form-fade-in">
        <div class="flex flex-col space-y-2">
          <div>
            <label for="max-uses" class="text-xs text-text-muted block mb-1">Max Uses</label>
            <input v-model.number="maxUses" 
                  type="number" 
                  id="max-uses"
                  min="1" 
                  class="w-full text-text p-1 text-sm bg-surface border border-border rounded"
                  placeholder="No limit" />
          </div>
          
          <div>
            <label for="expiry-option" class="text-xs text-text-muted block mb-1">Expires after</label>
            <select v-model="expiryOption" 
                   id="expiry-option"
                   class="w-full p-1 text-sm text-text bg-surface border border-border rounded">
              <option value="1">1 day</option>
              <option value="2">2 days</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
            </select>
          </div>
          
          <div class="flex justify-between pt-1">
            <button @click="showInviteForm = false" 
                   class="text-xs text-text-muted hover:text-error transition-colors duration-300"
                   aria-label="Cancel">
              Cancel
            </button>
            <button @click="createInvite" 
                   class="text-xs bg-theme-primary hover:bg-theme-secondary text-text px-3 py-1 rounded transition-colors duration-300"
                   :disabled="isCreatingInvite"
                   aria-label="Create invite">
              {{ isCreatingInvite ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Loading indicator -->
    <div v-if="showInviteForm && isLoadingInvites" class="flex justify-center py-2">
      <div class="w-4 h-4 border-2 border-t-theme-primary rounded-full animate-spin" aria-label="Loading invites"></div>
    </div>
    
    <!-- Active invites section -->
    <div v-if="activeInvites.length > 0" class="mt-3">
      <div class="flex justify-between items-center mb-2">
        <h4 class="text-xs font-medium text-text-muted">Active Invites</h4>
        <div class="flex items-center">
          <input type="checkbox" 
                id="hideInvitesCheckbox" 
                v-model="hideActiveInvites" 
                class="mr-1.5 cursor-pointer" />
          <label for="hideInvitesCheckbox" class="text-xs text-text-muted cursor-pointer">
             Hide
          </label>
        </div>
      </div>
      
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
              <input type="text" 
                    class="bg-transparent text-text text-sm flex-grow outline-none" 
                    readonly
                    :value="invite.code"
                    aria-label="Invite code" />
              <button @click="copyInviteCode(invite.code)" 
                     class="text-theme-primary hover:text-theme-primary-dark"
                     title="Copy invite code"
                     aria-label="Copy invite code">
                <fa :icon="['fas', 'copy']" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Current invite code display -->
    <div class="invite-form-container"
        :class="{ 'open': shouldShowCurrentInvite }">
      <div v-if="shouldShowCurrentInvite" 
          class="bg-background p-3 rounded-md mb-3 invite-form-fade-in">
        <div class="flex flex-col">
          <div class="flex justify-between items-center mb-2">
            <span class="text-xs text-text-muted">Active Invite</span>
            <span class="text-xs text-text-muted">Expires in {{ expiryDisplay }}</span>
          </div>
          
          <div class="flex items-center bg-surface p-2 rounded border border-border">
            <input ref="inviteCodeInput"
                  type="text" 
                  class="bg-transparent text-text text-sm flex-grow outline-none" 
                  readonly
                  :value="currentInviteCode"
                  aria-label="Current invite code" />
            <button v-if="currentInviteCode"
                   @click="copyInviteCode(currentInviteCode)" 
                   class="text-theme-primary hover:text-theme-primary-dark ml-2"
                   aria-label="Copy invite code">
              <fa :icon="['fas', 'copy']" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue';
import { showToast } from '~/utils/toast';
import { useServerPermissions, useServerInvitations } from '~/composables/server';

const props = defineProps<{
  serverId: string;
}>();

// Use the composables directly
const { hasRoleOrHigher } = useServerPermissions();
const { generateServerInvite, loadServerInvites, activeInvites, isLoadingInvites, clearActiveInvites } = useServerInvitations();

// Local state
const showInviteForm = ref(false);
const maxUses = ref<number | null>(null);
const expiryOption = ref('2');
const currentInviteCode = ref<string | null>(null);
const inviteCreatedAt = ref<Date | null>(null);
const isCreatingInvite = ref(false);
const isAdmin = ref(false);
const inviteCodeInput = ref<HTMLInputElement | null>(null);
const hideActiveInvites = ref(false);

// Computed property to determine if we should show the current invite code
const shouldShowCurrentInvite = computed(() => 
  currentInviteCode.value && 
  !showInviteForm.value && 
  !activeInvites.value.some(invite => invite.code === currentInviteCode.value)
);

// Check if user has admin permissions
watchEffect(async () => {
  if (props.serverId) {
    isAdmin.value = await hasRoleOrHigher(props.serverId, 'admin');
  } else {
    isAdmin.value = false;
  }
});

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

const expiryDisplay = computed(() => {
  if (!inviteCreatedAt.value || !expiryOption.value) return '';
  
  const now = new Date();
  const expiryDate = new Date(inviteCreatedAt.value.getTime() + parseInt(expiryOption.value) * 24 * 60 * 60 * 1000);
  return formatExpiryDate(expiryDate);
});

const showInviteFormAndLoadInvites = async () => {
  showInviteForm.value = true;
  
  if (props.serverId) {
    await loadServerInvites(props.serverId);
  }
};

const createInvite = async () => {
  if (!props.serverId) return;
  
  isCreatingInvite.value = true;
  
  try {
    const expiresInMs = parseInt(expiryOption.value) * 24 * 60 * 60 * 1000;
    const options = {
      expiresInMs,
      ...(maxUses.value && { maxUses: maxUses.value })
    };
    
    const result = await generateServerInvite(props.serverId, options);
    
    if (result.success && result.inviteCode) {
      currentInviteCode.value = result.inviteCode;
      inviteCreatedAt.value = new Date();
      showInviteForm.value = false;
      
      await loadServerInvites(props.serverId);
    }
  } catch (error) {
    showToast('Failed to create invite', 'error');
    console.error('Error creating invite:', error);
  } finally {
    isCreatingInvite.value = false;
  }
};

const copyInviteCode = (code: string) => {
  if (!code) return;
  
  navigator.clipboard.writeText(code)
    .then(() => {
      showToast('Invite code copied to clipboard', 'success');
    })
    .catch(() => {
      // Fallback for browsers that don't support clipboard API
      const tempInput = document.createElement('input');
      tempInput.value = code;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      
      showToast('Invite code copied to clipboard', 'success');
    });
};

watchEffect(() => {
  if (!props.serverId) {
    clearActiveInvites();
    currentInviteCode.value = null;
    showInviteForm.value = false;
  }
});
</script>