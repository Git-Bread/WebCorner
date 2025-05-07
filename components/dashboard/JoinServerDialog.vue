<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-background rounded-lg shadow-xl p-6 max-w-md w-full">
      <h2 class="text-xl font-semibold text-heading mb-4">Join a Server</h2>
      
      <!-- Join Method Tabs -->
      <div class="flex mb-4 border-b border-border">
        <button 
          @click="activeTab = 'serverId'"
          class="px-4 py-2 text-text-muted hover:text-text transition-all"
          :class="{ 'text-theme-primary border-b-2 border-theme-primary': activeTab === 'serverId' }"
        >
          Server ID
        </button>
        <button 
          @click="activeTab = 'invite'"
          class="px-4 py-2 text-text-muted hover:text-text transition-all"
          :class="{ 'text-theme-primary border-b-2 border-theme-primary': activeTab === 'invite' }"
        >
          Invitation Code
        </button>
      </div>
      
      <form @submit.prevent="handleJoin">
        <!-- Server ID Tab -->
        <div v-if="activeTab === 'serverId'">
          <div class="mb-4">
            <label for="serverId" class="block text-text mb-1">Server ID</label>
            <input
              id="serverId"
              v-model="serverId"
              type="text"
              class="w-full p-2 border border-border rounded-md bg-surface text-text"
              placeholder="Enter server ID"
              required
            />
            <p class="text-text-muted text-sm mt-1">Ask the server owner for the ID</p>
          </div>
        </div>
        
        <!-- Invite Code Tab -->
        <div v-else>
          <div class="mb-4">
            <label for="inviteCode" class="block text-text mb-1">Invitation Code</label>
            <input
              id="inviteCode"
              v-model="inviteCode"
              type="text"
              class="w-full p-2 border border-border rounded-md bg-surface text-text"
              placeholder="Enter invitation code"
              required
            />
            <p class="text-text-muted text-sm mt-1">Enter the invitation code sent by a server member</p>
          </div>
        </div>
        
        <!-- Error Message -->
        <p v-if="errorMessage" class="text-red-500 text-sm mb-4">{{ errorMessage }}</p>
        
        <div class="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 border border-border rounded-md text-text hover:bg-surface transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isJoining"
            class="px-4 py-2 bg-theme-primary text-background rounded-md hover:bg-opacity-90 transition-all"
          >
            {{ isJoining ? 'Joining...' : 'Join Server' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, watch } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  isJoining: boolean;
}>();

// Form state
const serverId = ref('');
const inviteCode = ref('');
const activeTab = ref('invite'); // Default to invite code tab
const errorMessage = ref('');

// Reset form when dialog opens/closes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    serverId.value = '';
    inviteCode.value = '';
    errorMessage.value = '';
  }
});

// Define emits
const emit = defineEmits<{
  (e: 'join', serverId: string): void;
  (e: 'join-with-invite', inviteCode: string): void;
  (e: 'close'): void;
}>();

const handleJoin = () => {
  errorMessage.value = '';
  
  if (activeTab.value === 'serverId') {
    if (!serverId.value.trim()) {
      errorMessage.value = 'Please enter a server ID';
      return;
    }
    emit('join', serverId.value.trim());
  } else {
    if (!inviteCode.value.trim()) {
      errorMessage.value = 'Please enter an invitation code';
      return;
    }
    emit('join-with-invite', inviteCode.value.trim());
  }
};
</script>