<template>
  <div class="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-page">
    <div class="max-w-md w-full space-y-8 relative z-10 form-fade-in bg-background p-8 rounded-lg shadow-lg">
      <h1 id="forgot-password-heading" class="mt-6 font-extrabold text-center text-heading">Reset your password</h1>
      
      <div v-if="emailSent" class="text-center">
        <div class="mb-6 text-theme-primary">
          <fa :icon="['fas', 'check-circle']" size="4x" />
        </div>
        <p class="mb-4 text-text">Password reset email sent!</p>
        <p class="mb-6 text-text-muted">Please check your email for instructions to reset your password.</p>
        <NuxtLink to="/login" class="inline-block bg-theme-primary text-background px-6 py-2 rounded hover:bg-theme-secondary transition duration-200">
          Return to login
        </NuxtLink>
      </div>

      <form v-else class="mt-8 space-y-4" @submit.prevent="handleForgotPassword" aria-labelledby="forgot-password-heading">
        <p class="text-text mb-4">Enter your email address and we'll send you instructions to reset your password.</p>
        
        <!-- Email field -->
        <AuthFormField 
          id="email-address" 
          name="email" 
          type="email" 
          label="Email address" 
          icon="envelope" 
          placeholder="Email address" 
          autocomplete="email" 
          v-model="email" 
          :errorMessage="emailError" 
          :hasError="!!emailError" 
          fieldClass="form-field-1"
          @blur="validateEmail"
        />

        <!-- General error message -->
        <AuthErrorMessage :message="generalError" />

        <!-- Submit button and login link -->
        <div class="mt-6 flex flex-col space-y-4">
          <button 
            type="submit" 
            :disabled="loading || !isEmailValid" 
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-background bg-theme-primary hover:bg-theme-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading" class="animate-spin mr-2">
              <fa :icon="['fas', 'circle-notch']" />
            </span>
            <span>Send reset instructions</span>
          </button>
          
          <div class="text-center">
            <NuxtLink to="/login" class="text-link hover:text-link-hover hover:underline">
              Back to login
            </NuxtLink>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { sendPasswordResetEmail } from 'firebase/auth'
import { showToast } from '~/utils/toast'
import { handleAuthError } from '~/utils/errorHandler'

definePageMeta({ layout: 'auth' })

const email = ref('')
const emailError = ref('')
const generalError = ref('')
const loading = ref(false)
const emailSent = ref(false)
const isEmailValid = ref(false)

const { auth } = useFirebase()

const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!email.value) {
    emailError.value = 'Email is required'
    isEmailValid.value = false
  } else if (!emailRegex.test(email.value)) {
    emailError.value = 'Please enter a valid email address'
    isEmailValid.value = false
  } else {
    emailError.value = ''
    isEmailValid.value = true
  }
}

const handleForgotPassword = async () => {
  validateEmail()
  
  if (!isEmailValid.value) {
    return
  }
  
  generalError.value = ''
  loading.value = true
  
  try {
    await sendPasswordResetEmail(auth, email.value)
    emailSent.value = true
    showToast('Password reset email sent!', 'success')
  } catch (error: any) {
    generalError.value = handleAuthError(error)
    showToast('Failed to send reset email', 'error')
  } finally {
    loading.value = false
  }
}
</script>