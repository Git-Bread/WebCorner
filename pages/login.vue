<template>
  <div class="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 relative z-10 pb-28 form-fade-in">
      <h2 class="mt-6 text-3xl font-extrabold text-center text-heading">Sign in to your account</h2>
      
      <form class="mt-8 space-y-4" @submit.prevent="handleLogin">
        <!-- Email field -->
        <div class="form-field-1">
          <label for="email-address" class="block text-sm font-medium text-text">Email address</label>
          <div class="flex items-center relative">
            <fa :icon="['fas', 'envelope']" class="text-text-light absolute left-3 z-20" />
            <input id="email-address" name="email" type="email" autocomplete="email" required 
              placeholder="Email address" v-model="formData.email" 
              @blur="validateField('email')"
              class="pl-10"
              :class="[baseInputClass, errors.email ? errorClass : normalClass]"/>
          </div>
          <p v-if="errors.email" class="mt-1 text-sm text-error">{{ errors.email }}</p>
        </div>
        
        <!-- Password field -->
        <div class="form-field-2">
          <label for="password" class="block text-sm font-medium text-text">Password</label>
          <div class="flex items-center relative">
            <fa :icon="['fas', 'lock']" class="text-text-light absolute left-3 z-20" />
            <input id="password" name="password" type="password" autocomplete="current-password" required
              placeholder="Password" v-model="formData.password"
              class="pl-10"
              :class="[baseInputClass, errors.password ? errorClass : normalClass]"/>
          </div>
          <p v-if="errors.password" class="mt-1 text-sm text-error">{{ errors.password }}</p>
        </div>

        <!-- General error message -->
        <div v-if="generalError" class="text-error text-sm p-3 bg-error-light border border-error-light rounded flex form-error-shake">
          <fa :icon="['fas', 'circle-exclamation']" class="h-5 w-5 mr-2 text-error" />
          <span>{{ generalError }}</span>
        </div>

        <div class="form-field-3">
          <button type="submit" 
            class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-secondary hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary"
            :class="{ 'opacity-50 cursor-not-allowed': !isFormValid || loading, 'submit-button-pulse': isFormValid && !loading }"
            :disabled="loading || !isFormValid">
            <fa v-if="loading" :icon="['fas', 'spinner']" class="animate-spin mt-0.5 h-5 w-5 mr-2" />
            <fa v-else :icon="['fas', 'right-to-bracket']" class="mr-2 mt-1" />
            Sign in
          </button>
          <div class="text-sm text-center mt-4 relative z-20">
            <NuxtLink to="/register" class="font-medium text-link hover:text-link-hover flex items-center justify-center">
              <span>Don't have an account? Register</span>
              <fa :icon="['fas', 'arrow-right']" class="ml-1" />
            </NuxtLink>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { showToast } from '~/utils/toast';
import { handleAuthError } from '~/utils/errorHandler'

definePageMeta({ layout: 'auth' })

// Common field classes using the color system
const baseInputClass = 'appearance-none rounded relative block w-full px-3 py-2 border text-text focus:outline-none focus:z-10 sm:text-sm'
const errorClass = 'border-error focus:ring-error focus:border-error'
const normalClass = 'border-border placeholder-text-light focus:ring-link focus:border-link'

// Form data and errors
const formData = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })
const generalError = ref('')
const loading = ref(false)
const { login } = useAuth()

// Simple login validation
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

// Validate Email
const validateField = (field: string) => {
  if (field !== 'email') return
  
  const value = formData[field]
  if (!value) return
  
  const fieldSchema = loginSchema[field]
  if (!fieldSchema) return
  
  const result = fieldSchema.safeParse(value)
  errors[field] = result.success ? '' : (result.error?.errors?.[0]?.message ?? 'Invalid input')
}

// Form validity check, checks so fields are not empty and no errors are present
const isFormValid = computed(() => {
  return formData.email && formData.password && !errors.email
})

const handleLogin = async () => {
  validateField('email')
  if (!isFormValid.value) return
  
  generalError.value = ''
  
  try {
    loading.value = true
    const result = await login(formData.email, formData.password)
    
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
  }
}
</script>