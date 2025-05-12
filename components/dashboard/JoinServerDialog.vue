<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-background rounded-lg shadow-xl p-6 max-w-md w-full">
      <h2 class="text-xl font-semibold text-heading mb-4">Join a Server</h2>
      
      <!-- Join Method Tabs -->
      <div class="flex mb-4 border-b border-border">
        <button 
          @click="form.activeTab = 'serverId'"
          class="px-4 py-2 text-text-muted hover:text-text transition-all"
          :class="{ 'text-theme-primary border-b-2 border-theme-primary': form.activeTab === 'serverId' }"
        >
          Server ID
        </button>
        <button 
          @click="form.activeTab = 'invite'"
          class="px-4 py-2 text-text-muted hover:text-text transition-all"
          :class="{ 'text-theme-primary border-b-2 border-theme-primary': form.activeTab === 'invite' }"
        >
          Invitation Code
        </button>
      </div>
      
      <form @submit.prevent="handleSubmit">
        <!-- Server ID Tab -->
        <div v-if="form.activeTab === 'serverId'">          
          <div class="mb-4">
            <label for="serverId" class="block text-text mb-1">Server ID</label>
            <div class="relative">
              <input
                id="serverId"
                v-model="form.serverId"
                type="text"
                :disabled="isJoining"
                class="w-full p-2 border border-border rounded-md bg-surface text-text"
                :class="{'opacity-75': isJoining}"
                placeholder="Enter server ID"
                required
              />
              <div v-if="isJoining && form.activeTab === 'serverId'" class="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div class="w-4 h-4 border-2 border-t-transparent border-theme-primary rounded-full animate-spin"></div>
              </div>
            </div>
            <p class="text-text-muted text-sm mt-1">Ask the server owner for the ID</p>
          </div>
        </div>
        
        <!-- Invite Code Tab -->
        <div v-else>          
          <div class="mb-4">
            <label for="inviteCode" class="block text-text mb-1">Invitation Code</label>
            <div class="relative">
              <input
                id="inviteCode"
                v-model="form.inviteCode"
                type="text"
                :disabled="isJoining"
                class="w-full p-2 border border-border rounded-md bg-surface text-text"
                :class="{'opacity-75': isJoining}"
                placeholder="Enter invitation code"
                required
              />
              <div v-if="isJoining && form.activeTab === 'invite'" class="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div class="w-4 h-4 border-2 border-t-transparent border-theme-primary rounded-full animate-spin"></div>
              </div>
            </div>
            <p class="text-text-muted text-sm mt-1">Enter the invitation code sent by a server member</p>
          </div>
        </div>
        
        <!-- Error Message -->
        <p v-if="errorMessage" class="text-error text-sm mb-4">{{ errorMessage }}</p>
        
        <div class="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            @click="handleClose"
            class="px-4 py-2 border border-border rounded-md text-text hover:bg-surface transition-all"
          >
            Cancel
          </button>          
          <button
            type="submit"
            :disabled="isJoining"
            class="px-4 py-2 bg-theme-primary text-background rounded-md hover:bg-opacity-90 transition-all flex items-center justify-center min-w-[100px]"
          >
            <span v-if="isJoining" class="w-4 h-4 border-2 border-t-transparent border-background rounded-full animate-spin mr-2"></span>
            {{ isJoining ? 'Joining...' : 'Join Server' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { useServerJoining, useServerInvitations } from '~/composables/server';
import { showToast } from '~/utils/toast';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faTimes, faSpinner, faLink, faServer, faIdCard } from '@fortawesome/free-solid-svg-icons';

library.add(faTimes, faSpinner, faLink, faServer, faIdCard);

const props = defineProps<{
  isOpen: boolean;
  isJoining: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'join', serverId: string): void;
  (e: 'join-with-invite', inviteCode: string): void;
}>();

// Form data
const form = reactive({
  activeTab: 'invite', // 'invite' or 'id'
  inviteCode: '',
  serverId: ''
});

// State tracking
const isInviteValid = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);

// Watch for server ID tab input
watch(() => form.serverId, (newValue) => {
  // Reset error on input change
  errorMessage.value = null;
  
  // Validate server ID format (must be a string with 20+ characters with optional dashes)
  if (newValue.trim().length > 0 && !/^[a-zA-Z0-9-]{10,}$/.test(newValue)) {
    errorMessage.value = 'Invalid server ID format';
  }
});

// Watch for invite code tab input
watch(() => form.inviteCode, (newValue) => {
  // Reset error on input change
  errorMessage.value = null;
  isInviteValid.value = false;
  
  // Validate invite code (alphanumeric with dashes, 6+ chars)
  if (newValue.trim().length > 0 && !/^[a-zA-Z0-9-]{6,}$/.test(newValue)) {
    errorMessage.value = 'Invalid invite code format';
  } else if (newValue.trim().length >= 6) {
    isInviteValid.value = true;
  }
});

// Handle join with ID
const handleJoinWithId = async () => {
  if (!form.serverId.trim() || errorMessage.value) return;
  
  try {
    // Emit join event to parent
    emit('join', form.serverId);
  } catch (error) {
    console.error('Error joining server by ID:', error);
  }
};

// Handle join with invite code
const handleJoinWithInvite = async () => {
  if (!form.inviteCode.trim() || !isInviteValid.value || errorMessage.value) return;
  
  try {
    // Emit join-with-invite event to parent
    emit('join-with-invite', form.inviteCode);
  } catch (error) {
    console.error('Error joining server with invite:', error);
  }
};

// Handle form submission based on active tab
const handleSubmit = () => {
  if (props.isJoining) return; // Prevent multiple submissions
  
  if (form.activeTab === 'invite') {
    handleJoinWithInvite();
  } else {
    handleJoinWithId();
  }
};

// Clear form data on close
const handleClose = () => {
  form.inviteCode = '';
  form.serverId = '';
  errorMessage.value = null;
  emit('close');
};

// Watch for dialog open/close to reset form
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    form.inviteCode = '';
    form.serverId = '';
    errorMessage.value = null;
  }
});
</script>