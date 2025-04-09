<template>
  <div class="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 pb-12 z-10 form-fade-in">
      <h2 id="register-heading" class="mt-6 text-3xl font-extrabold text-center text-heading">Create your account</h2>
      
      <form class="mt-8 space-y-4" @submit.prevent="handleRegister" aria-labelledby="register-heading">
        <!-- Email field -->
        <AuthFormField id="email-address" name="email" type="email" label="Email address" icon="envelope" placeholder="Email address" 
        autocomplete="email" v-model="formData.email" :errorMessage="errors.email" :hasError="!!errors.email" fieldClass="form-field-1" 
        @blur="validateField('email')" @update:modelValue="validateField('email')"/>
        
        <!-- Username field -->
        <AuthFormField id="username" name="username" type="text" label="Username" icon="user" placeholder="Username (3-30 characters)" 
        autocomplete="username" v-model="formData.username" :errorMessage="errors.username" :hasError="!!errors.username" fieldClass="pt-px form-field-2" 
        @blur="validateField('username')" @update:modelValue="validateField('username')"/>
        
        <!-- Password field -->
        <div class="form-field-3">
          <AuthFormField id="password" name="password" type="password" label="Password" icon="lock" placeholder="Password" 
          autocomplete="new-password" v-model="formData.password" :errorMessage="errors.password" :hasError="!!errors.password" 
          @blur="validateField('password')" @update:modelValue="validateField('password')">
            <p v-if="!errors.password && !passwordStrength" class="text-xs text-text-light mt-1">Password must be at least 6 characters long.</p>
          </AuthFormField>

          <!-- Password strength indicator -->
          <PasswordStrengthIndicator v-if="formData.password && !errors.password" :password="formData.password" />
        </div>

        <!-- General error message -->
        <AuthErrorMessage :message="generalError" />

        <!-- Submit button and login link -->
        <AuthSubmitButton :loading="loading" :disabled="!isFormValid" label="Register" iconName="user-plus" linkTo="/login" linkText="Already have an account? Sign in" />
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { userSchema, safeValidateUser } from '~/schemas/userSchemas'
import { doc, setDoc } from 'firebase/firestore'
import { showToast } from '~/utils/toast'
import { getRandomProfileImage } from '~/utils/profileImageUtils'
import { handleAuthError, handleDatabaseError } from '~/utils/errorHandler'
import { calculatePasswordStrength } from '~/utils/passwordUtils'
import useFormValidation from '~/composables/useFormValidation'
import PasswordStrengthIndicator from '~/components/auth/PasswordStrengthIndicator.vue'

definePageMeta({ layout: 'auth' })

// Setup form validation
const registrationSchema = {
  email: userSchema.shape.email,
  username: userSchema.shape.username,
  password: {
    safeParse: (value: string) => {
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

// Use our form validation composable with initial values
const { formData, errors, validateField, validateAllFields, isFormValid } = useFormValidation(
  registrationSchema, 
  { email: '', username: '', password: '' }
)
const passwordStrength = computed(() => calculatePasswordStrength(formData.password));

const generalError = ref('')
const loading = ref(false)
const { register } = useAuth()
const { firestore } = useFirebase()
const loadingTimeout = ref<number | null>(null);

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

// Form submission handler
const handleRegister = async () => {
  // Validate all fields
  validateAllFields()
  if (!isFormValid.value) {
    focusFirstError()
    return
  }
  
  generalError.value = ''
  try {
    // Timeout check, 15 seconds might be alot but someones internet might be slow
    loading.value = true
    loadingTimeout.value = window.setTimeout(() => {
      if (loading.value) {
        loading.value = false;
        generalError.value = "Request timed out. Please try again.";
      }
    }, 15000);

    const result = await register(formData.email, formData.password)
    
    if (!result.success) {
      generalError.value = handleAuthError(result.error)
      loading.value = false
      return
    }
    
    // Create user document in Firestore
    try {
      const { auth } = useFirebase()
      const uid = auth.currentUser?.uid
      
      if (!uid) throw new Error('User ID not found after registration')
      
      // Prepare user data according to userSchema
      const userData = {
        id: uid,
        username: formData.username,
        email: formData.email,
        profile_image_url: window.location.origin + getRandomProfileImage(),
        bio: '',
        servers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {},
        components: {}
      }
      
      // Validate and save user
      const userValidation = safeValidateUser(userData)
      if (!userValidation.success) {
        throw new Error(`Invalid user data: ${JSON.stringify(userValidation.error)}`)
      }
      
      await setDoc(doc(firestore, 'users', uid), userData)
      showToast('Register successful! Redirecting...', 'success', 3000)
      
      // Redirect to dashboard after registration
      setTimeout(() => {
        navigateTo('/test')
      }, 1000)
    } catch (err) {
      generalError.value = handleDatabaseError(err)
    }
  } catch (error) {
    generalError.value = handleAuthError(error)
  } finally {
    loading.value = false
  }
}
</script>