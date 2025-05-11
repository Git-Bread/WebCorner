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
            <div class="relative">
              <input
                id="serverId"
                v-model="serverId"
                type="text"
                :disabled="isJoiningServer"
                class="w-full p-2 border border-border rounded-md bg-surface text-text"
                :class="{'opacity-75': isJoiningServer}"
                placeholder="Enter server ID"
                required
              />
              <div v-if="isJoiningServer && activeTab === 'serverId'" class="absolute right-3 top-1/2 transform -translate-y-1/2">
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
                v-model="inviteCode"
                type="text"
                :disabled="isJoiningServer"
                class="w-full p-2 border border-border rounded-md bg-surface text-text"
                :class="{'opacity-75': isJoiningServer}"
                placeholder="Enter invitation code"
                required
              />
              <div v-if="isJoiningServer && activeTab === 'invite'" class="absolute right-3 top-1/2 transform -translate-y-1/2">
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
            @click="$emit('close')"
            class="px-4 py-2 border border-border rounded-md text-text hover:bg-surface transition-all"
          >
            Cancel
          </button>          
          <button
            type="submit"
            :disabled="isJoiningServer"
            class="px-4 py-2 bg-theme-primary text-background rounded-md hover:bg-opacity-90 transition-all flex items-center justify-center min-w-[100px]"
          >
            <span v-if="isJoiningServer" class="w-4 h-4 border-2 border-t-transparent border-background rounded-full animate-spin mr-2"></span>
            {{ isJoiningServer ? 'Joining...' : 'Join Server' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useServerCore, useServerJoining, useServerInvitations } from '~/composables/server';
import { showToast } from '~/utils/toast';

const props = defineProps<{
  isOpen: boolean;
}>();

// Use composables directly
const { setCurrentServer, loadUserServerList } = useServerCore();
const { joinServer, isJoiningServer: isJoiningDirectly } = useServerJoining();
const { joinServerWithInvite } = useServerInvitations();

// Maintain a local isJoiningWithInvite state since it's not exposed by the composable
const isJoiningWithInvite = ref(false);

// Form state
const serverId = ref('');
const inviteCode = ref('');
const activeTab = ref('invite'); // Default to invite code tab
const errorMessage = ref('');

// Computed property for overall joining state
const isJoiningServer = computed(() => 
  (activeTab.value === 'serverId' && isJoiningDirectly.value) || 
  (activeTab.value === 'invite' && isJoiningWithInvite.value)
);

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
  (e: 'close'): void;
}>();

const handleJoin = async () => {
  errorMessage.value = '';
  
  try {
    if (activeTab.value === 'serverId') {
      if (!serverId.value.trim()) {
        errorMessage.value = 'Please enter a server ID';
        return;
      }
      
      // Join server directly using the ID
      const result = await joinServer(serverId.value.trim());
      
      if (result && result.success && result.serverId) {
        // Reload server list
        await loadUserServerList();
        
        // Set as current server
        await setCurrentServer(result.serverId);
        
        // Close dialog
        emit('close');
        
        // Show success message
        showToast('Successfully joined server!', 'success');
      } else if (result && !result.success && result.reason) {
        errorMessage.value = result.reason;
      }
    } else {
      if (!inviteCode.value.trim()) {
        errorMessage.value = 'Please enter an invitation code';
        return;
      }
      
      // Start the joining process
      isJoiningWithInvite.value = true;
      
      try {
        // Join server using invitation code
        const result = await joinServerWithInvite(inviteCode.value.trim());
        
        if (result && result.success && result.serverId) {
          // Reload server list
          await loadUserServerList();
          
          // Set as current server
          await setCurrentServer(result.serverId);
          
          // Close dialog
          emit('close');
          
          // Show success message
          showToast('Successfully joined server with invitation!', 'success');
        } else if (result && !result.success && result.error) {
          errorMessage.value = result.error;
        }
      } finally {
        isJoiningWithInvite.value = false;
      }
    }
  } catch (error) {
    console.error('Error joining server:', error);
    errorMessage.value = 'An unexpected error occurred while joining the server';
    
    // Reset joining states
    isJoiningWithInvite.value = false;
  }
};
</script>