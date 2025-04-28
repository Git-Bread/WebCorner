<template>
  <div class="bg-background shadow-lg rounded-lg p-6 form-fade-in animation-delay-300">
    <h3 class="font-medium text-xl text-heading mb-4 pb-2 border-b border-border">Security</h3>
    
    <div class="space-y-6">
      <!-- Password section -->
      <div>
        <div class="flex justify-between items-center mb-2">
          <h4 class="font-medium text-heading">Password</h4>
          <button @click="$emit('togglePasswordReset')" class="text-link hover:text-link-hover hover:underline text-sm flex items-center">
            <fa :icon="['fas', showPasswordReset ? 'chevron-up' : 'key']" class="mr-1" />
            {{ showPasswordReset ? 'Hide' : 'Change Password' }}
          </button>
        </div>
        <p class="text-text-muted text-sm">Your password was last changed on {{ lastPasswordReset }}</p>
        
        <!-- Password reset form -->
        <div v-if="showPasswordReset" class="mt-4 p-4 bg-surface rounded-lg border border-border">
          <div class="space-y-4">
            <!-- Current Password with AuthFormField -->
            <AuthFormField
              id="current-password"
              name="currentPassword"
              type="password"
              label="Current Password"
              icon="lock"
              placeholder="Enter current password"
              v-model="passwordData.currentPassword"
            />
            
            <!-- New Password with AuthFormField -->
            <AuthFormField
              id="new-password"
              name="newPassword"
              type="password"
              label="New Password"
              icon="key"
              placeholder="Enter new password"
              v-model="passwordData.newPassword"
            >
              <PasswordStrengthIndicator :password="passwordData.newPassword" />
            </AuthFormField>
            
            <!-- Confirm Password with AuthFormField -->
            <AuthFormField
              id="confirm-password"
              name="confirmPassword"
              type="password"
              label="Confirm New Password"
              icon="check"
              placeholder="Confirm new password"
              v-model="passwordData.confirmPassword"
            />
            
            <!-- Error message display -->
            <AuthErrorMessage :message="passwordError" />
            
            <div class="flex justify-end space-x-3">
              <button 
                class="border border-border text-text px-4 py-2 text-sm rounded hover:bg-surface transition duration-200 flex items-center"
                @click="$emit('togglePasswordReset')"
              >
                <fa :icon="['fas', 'times']" class="mr-2" />
                Cancel
              </button>
              <button 
                class="bg-theme-primary text-background px-4 py-2 text-sm rounded hover:bg-theme-secondary transition duration-200 flex items-center"
                @click="$emit('updatePassword')"
                :disabled="isPasswordUpdating"
              >
                <span v-if="isPasswordUpdating" class="mr-2 animate-spin">
                  <fa :icon="['fas', 'spinner']" />
                </span>
                <fa v-else :icon="['fas', 'check']" class="mr-2" />
                Update Password
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Two-factor authentication section -->
      <div>
        <h4 class="font-medium text-heading mb-2">Two-Factor Authentication</h4>
        <p class="text-text-muted text-sm mb-3">Add an extra layer of security to your account</p>
        <button class="border border-border text-text px-4 py-2 rounded text-sm hover:bg-surface transition duration-200 flex items-center">
          <fa :icon="['fas', 'shield-alt']" class="mr-2" />
          Setup Two-Factor Authentication
        </button>
      </div>
      
      <!-- Account deletion section -->
      <div>
        <h4 class="font-medium text-heading mb-2">Account Deletion</h4>
        <p class="text-text-muted text-sm mb-3">Permanently delete your account and all your data</p>
        <button class="border border-error text-error px-4 py-2 rounded text-sm hover:bg-error-light hover:bg-opacity-10 transition duration-200 flex items-center">
          <fa :icon="['fas', 'trash-alt']" class="mr-2" />
          Delete Account
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AuthFormField from '~/components/auth/AuthFormField.vue';
import AuthErrorMessage from '~/components/auth/AuthErrorMessage.vue';
import PasswordStrengthIndicator from '~/components/auth/PasswordStrengthIndicator.vue';

const props = defineProps<{
  showPasswordReset: boolean;
  passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  passwordError: string;
  lastPasswordReset: string;
  isPasswordUpdating: boolean;
}>();

defineEmits<{
  (e: 'togglePasswordReset'): void;
  (e: 'updatePassword'): void;
  (e: 'update:passwordData', value: typeof props.passwordData): void;
}>();
</script>