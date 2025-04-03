<template>
  <div class="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">

    <div class="max-w-md w-full space-y-8 pb-12 z-10">
      <h2 class="mt-6 text-3xl font-extrabold text-center text-heading">Create your account</h2>
      <form class="mt-8 space-y-4" @submit.prevent="handleRegister">
        <!-- Email field -->
        <div>
          <label for="email-address" class="block text-sm font-medium text-text">Email address</label>
          <div class="flex items-center relative">
            <fa :icon="['fas', 'envelope']" class="text-text-light absolute left-3 z-20" />
            <input id="email-address" name="email" type="email" autocomplete="email" required 
              placeholder="Email address" v-model="formData.email" 
              @input="validateField('email')" @blur="validateField('email')"
              class="pl-10"
              :class="[baseInputClass, errors.email ? errorClass : normalClass]"/>
          </div>
          <p v-if="errors.email" class="mt-1 text-sm text-error">{{ errors.email }}</p>
        </div>
        
        <!-- Username field -->
        <div class="pt-px">
          <label for="username" class="block text-sm font-medium text-text">Username</label>
          <div class="flex items-center relative">
            <fa :icon="['fas', 'user']" class="text-text-light absolute left-3 z-20" />
            <input id="username" name="username" type="text" autocomplete="username" required
              placeholder="Username (3-30 characters)" v-model="formData.username"
              @input="validateField('username')" @blur="validateField('username')"
              class="pl-10"
              :class="[baseInputClass, errors.username ? errorClass : normalClass]"/>
          </div>
          <p v-if="errors.username" class="mt-1 text-sm text-error">{{ errors.username }}</p>
        </div>
        
        <!-- Password field -->
        <div>
          <label for="password" class="block text-sm font-medium text-text">Password</label>
          <div class="flex items-center relative">
            <fa :icon="['fas', 'lock']" class="text-text-light absolute left-3 z-20" />
            <input id="password" name="password" type="password" autocomplete="new-password" required
              placeholder="Password" v-model="formData.password"
              @input="validateField('password')" @blur="validateField('password')"
              class="pl-10"
              :class="[baseInputClass, errors.password ? errorClass : normalClass]"/>
          </div>
          <p v-if="errors.password" class="mt-1 text-sm text-error">{{ errors.password }}</p>
          
          <!-- Password strength indicator -->
          <div v-if="formData.password && !errors.password" class="mt-1">
            <div class="h-1 w-full bg-border rounded-full overflow-hidden">
              <div :class="['h-full', strengthColorClass]" :style="{ width: passwordStrength + '%' }"></div>
            </div>
            <p class="text-xs mt-1 flex items-center" :class="strengthTextColorClass">
              <fa :icon="strengthIcon" class="mr-1" />
              {{ strengthText }}
            </p>
          </div>
        </div>

        <!-- General error message -->
        <div v-if="generalError" class="text-error text-sm p-3 bg-error-light border border-error-light rounded flex">
          <fa :icon="['fas', 'circle-exclamation']" class="h-5 w-5 mr-2 text-error" />
          <span>{{ generalError }}</span>
        </div>

        <!-- Submit button and login link -->
        <div class="relative">
          <button type="submit" 
            class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-secondary hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary"
            :disabled="loading || !isFormValid"
            :class="{ 'opacity-50 cursor-not-allowed': !isFormValid }">
            <fa v-if="loading" :icon="['fas', 'spinner']" class="animate-spin mt-0.5 h-5 w-5 mr-2" />
            <fa v-else :icon="['fas', 'user-plus']" class="mr-2 mt-0.5" />
            Register
          </button>
          <div class="text-sm text-center mt-4 relative z-20">
            <NuxtLink to="/login" class="font-medium text-link hover:text-link-hover flex items-center justify-center">
              <span>Already have an account? Sign in</span>
              <fa :icon="['fas', 'arrow-right']" class="ml-1" />
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

// Common classes using your simplified color system
const baseInputClass = 'appearance-none rounded relative block w-full px-3 py-2 border text-text focus:outline-none focus:z-10 sm:text-sm'
const errorClass = 'border-error focus:ring-error focus:border-error'
const normalClass = 'border-border placeholder-text-light focus:ring-link focus:border-link'

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

// Computed properties for password strength UI using status colors
const strengthColorClass = computed(() => 
  passwordStrength.value < 33 ? 'bg-error' : 
  passwordStrength.value < 66 ? 'bg-warning' : 'bg-success'
)

// Text color for the strength text using status colors
const strengthTextColorClass = computed(() => 
  passwordStrength.value < 33 ? 'text-error' : 
  passwordStrength.value < 66 ? 'text-warning' : 'text-success'
)

// Icon for password strength
const strengthIcon = computed(() =>
  passwordStrength.value < 33 ? ['fas', 'exclamation-triangle'] :
  passwordStrength.value < 66 ? ['fas', 'info-circle'] : ['fas', 'check-circle']
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
      // TODO: Add default login page
      
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