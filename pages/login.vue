<template>
  <div class="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 relative z-10 pb-28 form-fade-in">
      <h2 id="login-heading" class="mt-6 text-3xl font-extrabold text-center text-heading">Sign in to your account</h2>
      
      <form class="mt-8 space-y-4" @submit.prevent="handleLogin" aria-labelledby="login-heading">
        <!-- Email field -->
        <AuthFormField id="email-address" name="email" type="email" label="Email address" icon="envelope" placeholder="Email address" 
        autocomplete="email" v-model="formData.email" :errorMessage="errors.email" :hasError="!!errors.email" fieldClass="form-field-1" 
        @blur="validateField('email')"/>
        
        <!-- Password field -->
        <AuthFormField id="password" name="password" type="password" label="Password" icon="lock" placeholder="Password" 
        autocomplete="current-password" v-model="formData.password" :errorMessage="errors.password" :hasError="!!errors.password" fieldClass="form-field-2"/>

        <!-- Remember Me checkbox -->
        <div class="flex items-center justify-between mt-2 form-field-2">
          <div class="flex items-center">
            <input id="remember-me" name="remember-me" type="checkbox" v-model="rememberMe" class="h-4 w-4 text-accent-blue focus:ring-accent-blue border-foreground rounded">
            <label for="remember-me" class="ml-2 block text-sm text-text">Remember me</label>
          </div>
          <div class="text-right">
            <!-- Forgot Password Button -->
            <NuxtLink to="/forgot-password" class="text-sm text-link hover:text-link-hover mt-0">
              Forgot your password?
            </NuxtLink>
          </div>
        </div>

        <!-- General error message -->
        <AuthErrorMessage :message="generalError" />

        <!-- Submit button and register link -->
        <AuthSubmitButton :loading="loading" :disabled="!isFormValid" label="Sign in" iconName="right-to-bracket" linkTo="/register" 
        linkText="Don't have an account? Register" fieldClass="form-field-3"/>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { showToast } from '~/utils/toast'
import { handleAuthError } from '~/utils/errorHandler'
import useFormValidation from '~/composables/useFormValidation'

definePageMeta({ layout: 'auth' })

// Login validation with regex
// This schema is used to validate the email format and password length
const loginSchema = {
  email: {
    safeParse: (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return { 
          success: false, 
          error: { errors: [{ message: "Please enter a valid email address" }] }
        }
      }
      return { success: true }
    }
  }
}

// Use form validation composable with field initial values
const { formData, errors, validateField, isFormValid } = useFormValidation(
  loginSchema, 
  { email: '', password: '' }
)

const generalError = ref('')
const loading = ref(false)
const { login } = useAuth()
const loadingTimeout = ref<number | null>(null);
const rememberMe = ref(false);

// Focus the first error field after validation for keyboard accessibility
const focusFirstError = () => {
  nextTick(() => {
    const firstErrorField = Object.keys(errors).find(key => !!errors[key]);
    if (firstErrorField) {
      const element = document.getElementById(firstErrorField);
      if (element) element.focus();
    }
  });
};

const handleLogin = async () => {
  validateField('email')
  if (!isFormValid.value) {
    focusFirstError()
    return
  }
  
  generalError.value = ''
  
  try {
    // Timeout check
    loading.value = true
    loadingTimeout.value = window.setTimeout(() => {
      if (loading.value) {
        loading.value = false;
        generalError.value = "Request timed out. Please try again.";
      }
    }, 15000);

    const result = await login(formData.email, formData.password, rememberMe.value)
    
    if (!result.success) {
      generalError.value = handleAuthError(result.error)
    } else {
      showToast('Login successful! Redirecting...', 'success', 3000)
      
      setTimeout(() => {
        navigateTo('/test')
      }, 1000)
    }
  } catch (error) {
    generalError.value = handleAuthError(error)
  } finally {
    loading.value = false
    if (loadingTimeout.value) {
      clearTimeout(loadingTimeout.value);
      loadingTimeout.value = null;
    }
  }
}
</script>