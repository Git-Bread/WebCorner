<template>
  <div class="bg-background shadow-lg rounded-lg p-6 form-fade-in">
    <h3 class="font-medium text-xl text-heading mb-4 pb-2 border-b border-border" id="security-heading">Security</h3>
    
    <div class="space-y-6">
      <!-- Password section -->
      <div role="region" aria-labelledby="password-heading">
        <div class="flex justify-between items-center mb-2">
          <h4 class="font-medium text-heading" id="password-heading">Password</h4>
          <button 
            @click="togglePasswordReset" 
            class="text-link hover:text-link-hover hover:underline text-sm flex items-center"
            :aria-expanded="passwordResetVisible"
            aria-controls="password-reset-form"
          >
            <fa :icon="['fas', passwordResetVisible ? 'chevron-up' : 'key']" class="mr-1" aria-hidden="true" />
            {{ passwordResetVisible ? 'Hide' : 'Change Password' }}
          </button>
        </div>
        <p class="text-text-muted text-sm">Your password was last changed on {{ lastPasswordReset }}</p>
        
        <!-- Password reset form -->
        <div v-if="passwordResetVisible" id="password-reset-form" class="mt-4 p-4 bg-surface rounded-lg border border-border">
          <div class="space-y-4">
            <!-- Current Password with AuthFormField -->
            <AuthFormField id="current-password" name="currentPassword" type="password" label="Current Password" icon="lock"
              placeholder="Enter current password" v-model="localPasswordData.currentPassword" 
              :errorMessage="validationAttempted ? fieldErrors.currentPassword : ''" 
              :hasError="validationAttempted && !!fieldErrors.currentPassword" />
            
            <!-- New Password with AuthFormField -->
            <AuthFormField id="new-password" name="newPassword" type="password" label="New Password" icon="key"
              placeholder="Enter new password" v-model="localPasswordData.newPassword"
              :errorMessage="validationAttempted ? fieldErrors.newPassword : ''" 
              :hasError="validationAttempted && !!fieldErrors.newPassword">
              <PasswordStrengthIndicator :password="localPasswordData.newPassword" />
            </AuthFormField>
            
            <!-- Confirm Password with AuthFormField -->
            <AuthFormField id="confirm-password" name="confirmPassword" type="password" label="Confirm New Password" icon="check"
              placeholder="Confirm new password" v-model="localPasswordData.confirmPassword"
              :errorMessage="validationAttempted ? fieldErrors.confirmPassword : ''" 
              :hasError="validationAttempted && !!fieldErrors.confirmPassword" />
            
            <!-- Only show general error message if it doesn't match any specific field -->
            <AuthErrorMessage v-if="errorMessage && validationAttempted && !hasFieldSpecificError" :message="errorMessage" role="alert" />
            
            <div class="flex justify-end space-x-3">
              <button 
                class="border border-border text-text px-4 py-2 text-sm rounded hover:bg-surface transition duration-200 flex items-center"
                @click="cancelPasswordReset"
                aria-label="Cancel password change"
              >
                <fa :icon="['fas', 'times']" class="mr-2" aria-hidden="true" /> Cancel
              </button>
              <button 
                class="bg-theme-primary text-background px-4 py-2 text-sm rounded hover:bg-theme-secondary transition duration-200 flex items-center"
                @click="handleUpdatePassword" 
                :disabled="isUpdating"
                aria-label="Update password"
              >
                <span v-if="isUpdating" class="mr-2 animate-spin"><fa :icon="['fas', 'spinner']" aria-hidden="true" /></span>
                <fa v-else :icon="['fas', 'check']" class="mr-2" aria-hidden="true" /> Update Password
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Account deletion section -->
      <div role="region" aria-labelledby="account-deletion-heading">
        <h4 class="font-medium text-heading mb-2" id="account-deletion-heading">Account Deletion</h4>
        <p class="text-text-muted text-sm mb-3">Permanently delete your account and all your data</p>
        <button 
          @click="confirmDeleteAccount" 
          class="border border-error text-error px-4 py-2 rounded text-sm hover:bg-error-light hover:bg-opacity-10 transition duration-200 flex items-center"
          aria-label="Delete your account"
          :disabled="isDeleting"
        >
          <fa :icon="['fas', 'trash-alt']" class="mr-2" aria-hidden="true" /> Delete Account
        </button>
      </div>
    </div>
    
    <!-- Delete Account Confirmation Modal -->
    <DeleteAccountModal 
      :showModal="showDeleteModal" 
      @close="closeDeleteModal" 
      @confirm="handleDeleteAccount" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import AuthFormField from '~/components/auth/AuthFormField.vue';
import AuthErrorMessage from '~/components/auth/AuthErrorMessage.vue';
import PasswordStrengthIndicator from '~/components/auth/PasswordStrengthIndicator.vue';
import DeleteAccountModal from '~/components/ui/DeleteAccountModal.vue';
import { validatePassword, validatePasswordsMatch } from '~/utils/passwordUtils';
import { showToast } from '~/utils/toast';

// Use the profile composable
const { lastPasswordReset, updatePassword, deleteAccount, isDeleting, deleteError } = useProfile();
const router = useRouter();

// Local state management (instead of using global state from the composable)
const passwordResetVisible = ref(false);
const validationAttempted = ref(false);
const errorMessage = ref('');
const isUpdating = ref(false);
const showDeleteModal = ref(false);

// Use local reactive object instead of global state
const localPasswordData = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

// Toggle password reset view
function togglePasswordReset() {
  passwordResetVisible.value = !passwordResetVisible.value;
  if (!passwordResetVisible.value) {
    resetForm();
  }
}

// Reset the form state
function resetForm() {
  validationAttempted.value = false;
  errorMessage.value = '';
  Object.assign(localPasswordData, {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
}

// Cancel password reset and clear validation
function cancelPasswordReset() {
  resetForm();
  passwordResetVisible.value = false;
}

// Validate the password form locally
function validateForm() {
  // Reset validation state
  validationAttempted.value = true;
  errorMessage.value = '';
  
  // Validate current password
  if (!localPasswordData.currentPassword) {
    errorMessage.value = 'Please enter your current password';
    return false;
  }
  
  // Validate new password using utility function
  const passwordValidation = validatePassword(localPasswordData.newPassword);
  
  if (!passwordValidation.valid) {
    errorMessage.value = passwordValidation.message;
    return false;
  }
  
  // Check passwords match using utility function
  const matchValidation = validatePasswordsMatch(
    localPasswordData.newPassword, 
    localPasswordData.confirmPassword
  );
  
  if (!matchValidation.valid) {
    errorMessage.value = matchValidation.message;
    return false;
  }
  
  return true;
}

// Parse the main error message into field-specific errors
const fieldErrors = computed(() => {
  const errors = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  
  if (errorMessage.value) {
    if (errorMessage.value.toLowerCase().includes('current password')) {
      errors.currentPassword = errorMessage.value;
    } else if (errorMessage.value.toLowerCase().includes('match')) {
      errors.confirmPassword = errorMessage.value;
    } else if (
      errorMessage.value.toLowerCase().includes('password must') || 
      errorMessage.value.toLowerCase().includes('at least')
    ) {
      errors.newPassword = errorMessage.value;
    }
  }
  
  return errors;
});

// Check if we have any field-specific errors
const hasFieldSpecificError = computed(() => 
  !!fieldErrors.value.currentPassword || 
  !!fieldErrors.value.newPassword || 
  !!fieldErrors.value.confirmPassword
);

// Update password with local form data
async function handleUpdatePassword() {
  if (!validateForm()) return;
  
  try {
    isUpdating.value = true;
    
    // Call the composable's updatePassword with local data
    await updatePassword({
      currentPassword: localPasswordData.currentPassword,
      newPassword: localPasswordData.newPassword,
      confirmPassword: localPasswordData.confirmPassword
    });
    
    // Reset form on success
    resetForm();
    passwordResetVisible.value = false;
  } catch (error: any) {
    errorMessage.value = error.message || 'Failed to update password';
  } finally {
    isUpdating.value = false;
  }
}

// Account deletion confirmation
function confirmDeleteAccount() {
  showDeleteModal.value = true;
}

// Handle account deletion
async function handleDeleteAccount(password: string) {
  try {
    const success = await deleteAccount(password);
    
    if (success) {
      // Navigate to login page after successful deletion
      router.push('/login');
    } else if (deleteError.value) {
      // Show error message in modal
      showToast(deleteError.value, 'error');
    }
  } catch (error) {
    showToast('Failed to delete account', 'error');
  }
}

// Close delete modal
function closeDeleteModal() {
  showDeleteModal.value = false;
}
</script>