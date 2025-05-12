<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ui-overlay">
      <div 
        class="bg-surface border border-border rounded-lg shadow-lg max-w-md w-full p-6 animate-fade-in"
        role="dialog"
        aria-labelledby="delete-account-modal-title"
        aria-describedby="delete-account-modal-description"
        @click.stop
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
            ref="passwordInput"
          />
        </div>
        
        <div class="flex justify-center space-x-4">
          <!-- Cancel Button -->
          <button 
            @click="handleClose" 
            class="py-2 px-4 border border-border text-text rounded-md transition-all flex items-center justify-center hover:bg-secondary"
            aria-label="Cancel account deletion"
          >
            <fa :icon="['fas', 'times']" class="mr-2" aria-hidden="true" />
            Cancel
          </button>
          
          <!-- Delete Button -->
          <button 
            @click="handleConfirm" 
            class="py-2 px-4 bg-error text-background rounded-md hover:bg-error/80 transition-all flex items-center justify-center hover:bg-secondary"
            :disabled="isLoading"
            aria-label="Permanently delete account"
          >
            <fa :icon="['fas', 'trash']" class="mr-2" aria-hidden="true" />
            <span v-if="isLoading" class="inline-block mr-2">
              <fa :icon="['fas', 'spinner']" class="animate-spin" aria-hidden="true" />
            </span>
            {{ isLoading ? 'Deleting...' : 'Delete Account' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
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
const passwordInput = ref(null);

// Focus password input when modal shows
watch(() => props.show, (newVal) => {
  if (newVal) {
    // Reset state when modal opens
    password.value = '';
    errorMessage.value = '';
    
    // Focus the input after modal is fully rendered
    nextTick(() => {
      const inputElement = document.getElementById('delete-account-password');
      if (inputElement) {
        (inputElement as HTMLInputElement).focus();
      }
    });
  }
});

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
  
  // Check for auth state - this helps with new user cases
  const { user } = useAuth();
  if (!user.value) {
    errorMessage.value = 'Authentication error. Please try refreshing the page.';
    return;
  }
  
  isLoading.value = true;
  
  try {
    emit('confirm', password.value);
  } catch (error) {
    // Error handling is done at the parent component level
    isLoading.value = false;
    errorMessage.value = 'An unexpected error occurred';
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