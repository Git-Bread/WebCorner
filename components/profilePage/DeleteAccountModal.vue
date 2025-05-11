<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ui-overlay">
    <div 
      class="bg-surface border border-border rounded-lg shadow-lg max-w-md w-full p-6 animate-fade-in"
      role="dialog"
      aria-labelledby="delete-account-modal-title"
      aria-describedby="delete-account-modal-description"
    >
      <div class="mb-4 text-center">
        <div class="inline-flex items-center justify-center h-12 w-12 rounded-full bg-error-light bg-opacity-20 mb-4">
          <fa :icon="['fas', 'exclamation-triangle']" class="text-error" size="lg" aria-hidden="true" />
        </div>
        <h3 class="text-xl font-medium text-heading mb-1" id="delete-account-modal-title">Delete Account</h3>
        <p class="text-text-muted" id="delete-account-modal-description">
          This action permanently deletes your account and all associated data. This cannot be undone.
        </p>
      </div>
      
      <div class="space-y-4 mb-6">
        <AuthFormField 
          id="delete-account-password" 
          name="password" 
          type="password" 
          label="Your Password" 
          icon="lock"
          placeholder="Enter your current password to confirm" 
          v-model="password"
          :errorMessage="errorMessage"
          :hasError="!!errorMessage"
          @keydown.enter="handleConfirm"
        />
      </div>
      
      <div class="flex justify-end space-x-3">
        <button 
          @click="handleClose" 
          class="border border-border text-text px-4 py-2 text-sm rounded hover:bg-surface-hover transition duration-200"
          aria-label="Cancel account deletion"
        >
          Cancel
        </button>
        <button 
          @click="handleConfirm" 
          class="bg-error text-background px-4 py-2 text-sm rounded hover:bg-error-dark transition duration-200 flex items-center"
          :disabled="isLoading"
          aria-label="Permanently delete account"
        >
          <span v-if="isLoading" class="inline-block mr-2">
            <fa :icon="['fas', 'spinner']" class="animate-spin" aria-hidden="true" />
          </span>
          {{ isLoading ? 'Deleting...' : 'Delete Account' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AuthFormField from '~/components/auth/AuthFormField.vue';

const emit = defineEmits(['close', 'confirm']);

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  isUserWithProvider: {
    type: Boolean,
    default: false
  }
});

const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

function validatePassword() {
  if (!password.value || password.value.trim() === '') {
    errorMessage.value = 'Password is required to delete your account';
    return false;
  }
  
  errorMessage.value = '';
  return true;
}

function handleClose() {
  password.value = '';
  errorMessage.value = '';
  emit('close');
}

function handleConfirm() {
  if (!validatePassword()) {
    return;
  }
  
  try {
    emit('confirm', password.value);
  } catch (error) {
    // Error handling is done at the parent component level
  }
}
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style> 