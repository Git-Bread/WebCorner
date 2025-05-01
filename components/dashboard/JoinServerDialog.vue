<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-background rounded-lg shadow-xl p-6 max-w-md w-full">
      <h2 class="text-xl font-semibold text-heading mb-4">Join a Server</h2>
      
      <form @submit.prevent="handleJoin">
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
import { ref, defineProps, defineEmits } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  isJoining: boolean;
}>();

const serverId = ref('');

const emit = defineEmits<{
  (e: 'join', serverId: string): void;
  (e: 'close'): void;
}>();

const handleJoin = () => {
  emit('join', serverId.value.trim());
};
</script>