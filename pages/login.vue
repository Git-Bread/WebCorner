<template>
  <div class="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <h2 class="mt-6 text-3xl font-extrabold text-center">Sign in to your account</h2>
      
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <!-- Email field -->
        <div>
          <label for="email-address" class="block text-sm font-medium">Email address</label>
          <input id="email-address" name="email" type="email" autocomplete="email" required 
            placeholder="Email address" v-model="formData.email" 
            @blur="validateField('email')"
            :class="[baseInputClass, errors.email ? errorClass : normalClass]"/>
          <p v-if="errors.email" class="mt-1 text-sm text-red-600">{{ errors.email }}</p>
        </div>
        
        <!-- Password field -->
        <div>
          <label for="password" class="block text-sm font-medium">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required
            placeholder="Password" v-model="formData.password"
            :class="[baseInputClass, errors.password ? errorClass : normalClass]"/>
          <p v-if="errors.password" class="mt-1 text-sm text-red-600">{{ errors.password }}</p>
        </div>

        <!-- General error message -->
        <div v-if="generalError" class="text-red-500 text-sm p-3 bg-red-50 border border-red-200 rounded flex">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <span>{{ generalError }}</span>
        </div>

        <div>
          <button type="submit" 
            class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            :disabled="loading || !isFormValid"
            :class="{ 'opacity-50 cursor-not-allowed': !isFormValid || loading }">
            <span v-if="loading" class="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            Sign in
          </button>
          <div class="text-sm text-center mt-4">
            <NuxtLink to="/register" class="font-medium hover:underline text-indigo-700">Don't have an account? Register</NuxtLink>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

definePageMeta({ layout: 'auth' })

// Common field classes
const baseInputClass = 'appearance-none rounded relative block w-full px-3 py-2 border text-gray-900 focus:outline-none focus:z-10 sm:text-sm'
const errorClass = 'border-red-500 focus:ring-red-500 focus:border-red-500'
const normalClass = 'border-gray-300 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500'

// Form data and errors
const formData = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })
const generalError = ref('')
const loading = ref(false)
const { login } = useAuth()

// Simple login validation
const loginSchema = {
  email: {
    safeParse: (value) => {
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
const validateField = (field) => {
  if (field !== 'email') return
  
  const value = formData[field]
  if (!value) return
  
  const fieldSchema = loginSchema[field]
  if (!fieldSchema) return
  
  const result = fieldSchema.safeParse(value)
  errors[field] = result.success ? '' : result.error.errors[0].message
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
      generalError.value = 'Invalid email or password'

      // Log the error to console in development mode, debugging, should not be in production since it says what type of error it is
      if (process.env.NODE_ENV === 'development') {
        console.error('Login error:', result.error)
        console.error(process.env.NODE_ENV)
      }
    } else {
      // ADDITIONAL LOGIC FOR SUCCESSFUL LOGIN
    }
  } catch (error) {
    console.error('Login error:', error)
    generalError.value = 'An unexpected error occurred. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>