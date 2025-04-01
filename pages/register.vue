<template>
  <div class="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 pb-12">
      <h2 class="mt-6 text-3xl font-extrabold text-center">Create your account</h2>
      
      <form class="mt-8 space-y-6" @submit.prevent="handleRegister">
        <!-- Email field -->
        <div>
          <label for="email-address" class="block text-sm font-medium">Email address</label>
          <input id="email-address" name="email" type="email" autocomplete="email" required 
            placeholder="Email address" v-model="formData.email" 
            @input="validateField('email')" @blur="validateField('email')"
            :class="[baseInputClass, errors.email ? errorClass : normalClass]"/>
          <p v-if="errors.email" class="mt-1 text-sm text-red-600">{{ errors.email }}</p>
        </div>
        
        <!-- Username field -->
        <div>
          <label for="username" class="block text-sm font-medium">Username</label>
          <input id="username" name="username" type="text" autocomplete="username" required
            placeholder="Username (3-30 characters)" v-model="formData.username"
            @input="validateField('username')" @blur="validateField('username')"
            :class="[baseInputClass, errors.username ? errorClass : normalClass]"/>
          <p v-if="errors.username" class="mt-1 text-sm text-red-600">{{ errors.username }}</p>
        </div>
        
        <!-- Password field -->
        <div>
          <label for="password" class="block text-sm font-medium">Password</label>
          <input id="password" name="password" type="password" autocomplete="new-password" required
            placeholder="Password" v-model="formData.password"
            @input="validateField('password')" @blur="validateField('password')"
            :class="[baseInputClass, errors.password ? errorClass : normalClass]"/>
          <p v-if="errors.password" class="mt-1 text-sm text-red-600">{{ errors.password }}</p>
          
          <!-- Password strength indicator -->
          <div v-if="formData.password && !errors.password" class="mt-1">
            <div class="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
              <div :class="['h-full', strengthColor]" :style="{ width: passwordStrength + '%' }"></div>
            </div>
            <p class="text-xs mt-1">{{ strengthText }}</p>
          </div>
        </div>

        <!-- General error message -->
        <div v-if="generalError" class="text-red-500 text-sm p-3 bg-red-50 border border-red-200 rounded flex">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <span>{{ generalError }}</span>
        </div>

        <!-- Submit button and login link -->
        <div>
          <button type="submit" 
            class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            :disabled="loading || !isFormValid"
            :class="{ 'opacity-50 cursor-not-allowed': !isFormValid }">
            <span v-if="loading" class="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            Register
          </button>
          <div class="text-sm text-center mt-4">
            <NuxtLink to="/login" class="font-medium text-indigo-700 hover:underline">
              Already have an account? Sign in
            </NuxtLink>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { userSchema, safeValidateUser } from '~/schemas/userSchemas'
import { collection, doc, setDoc } from 'firebase/firestore'

definePageMeta({ layout: 'auth' })

// Common classes
const baseInputClass = 'appearance-none rounded relative block w-full px-3 py-2 border text-gray-900 focus:outline-none focus:z-10 sm:text-sm'
const errorClass = 'border-red-500 focus:ring-red-500 focus:border-red-500'
const normalClass = 'border-gray-300 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500'

// Form data and errors
const formData = reactive({ email: '', username: '', password: '' })
const errors = reactive({ email: '', username: '', password: '' })
const generalError = ref('')
const loading = ref(false)
const { register } = useAuth()

// Registration schema using references from userSchema
const registrationSchema = {
  email: userSchema.shape.email,
  username: userSchema.shape.username,
  password: {
    safeParse: (value) => {
      if (value.length < 6) {
        return { 
          success: false, 
          error: { errors: [{ message: "Password must be at least 6 characters" }] }
        }
      }
      return { success: true }
    }
  }
}

// Field validation
const validateField = (field) => {
  const value = formData[field]
  if (!value) return // Skip empty fields during typing
  
  const fieldSchema = registrationSchema[field]
  if (!fieldSchema) return
  
  const result = fieldSchema.safeParse(value)
  errors[field] = result.success ? '' : result.error.errors[0].message
}

// Password strength calculator
const passwordStrength = computed(() => {
  const password = formData.password
  if (!password) return 0
  
  let score = 0
  if (password.length >= 8) score += 25
  else if (password.length >= 6) score += 10
  if (/\d/.test(password)) score += 25
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 25
  if (/[^a-zA-Z0-9]/.test(password)) score += 25
  
  return Math.min(score, 100)
})

// Computed properties for password strength UI
const strengthColor = computed(() => 
  passwordStrength.value < 33 ? 'bg-red-500' : 
  passwordStrength.value < 66 ? 'bg-yellow-500' : 'bg-green-500'
)
const strengthText = computed(() =>
  passwordStrength.value < 33 ? 'Weak password' : 
  passwordStrength.value < 66 ? 'Medium strength' : 'Strong password'
)

// Form validity check
const isFormValid = computed(() => {
  const hasRequiredFields = formData.email && formData.username && formData.password
  const hasNoErrors = !errors.email && !errors.username && !errors.password
  return hasRequiredFields && hasNoErrors
})

// Form submission handler
const handleRegister = async () => {
  // Validate all fields
  ['email', 'username', 'password'].forEach(field => validateField(field))
  if (!isFormValid.value) return
  
  generalError.value = ''
  try {
    loading.value = true
    const result = await register(formData.email, formData.password)
    
    if (!result.success) {
      // Check for specific Firebase error messages and provide user-friendly responses
      if (result.error?.includes('auth/email-already-in-use') || result.error?.includes('email-already-in-use')) {
        generalError.value = 'This email is already registered. Please use a different email or sign in.'
      } else {
        generalError.value = 'Failed to register. Please try again.'
      }
      if (process.env.NODE_ENV === 'development') {
        console.error('Registration error:', result.error)
      }
      loading.value = false
      return
    }
    
    // Create user document in Firestore
    try {
      const { auth, firestore } = useFirebase()
      const uid = auth.currentUser?.uid
      
      if (!uid) throw new Error('User ID not found after registration')
      
      // Prepare user data according to userSchema
      const userData = {
        id: uid,
        username: formData.username,
        email: formData.email,
        profile_image_url: null,
        bio: '',
        servers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {},
        components: {}
      }
      
      // Validate and save user
      const userValidation = safeValidateUser(userData)
      if (!userValidation.success) throw new Error('Invalid user data')
      
      await setDoc(doc(collection(firestore, 'users'), uid), userData)
      navigateTo('/dashboard')
      
    } catch (err) {
      console.error('Error creating user document:', err)
      generalError.value = 'Account created but profile setup failed. Please contact support.'
    }
  } catch (error) {
    console.error('Registration error:', error)
    generalError.value = 'An unexpected error occurred. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>