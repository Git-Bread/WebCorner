<template>
  <div class="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 z-10 form-fade-in bg-background p-8 rounded-lg shadow-lg">
      <h1 id="register-heading" class="mt-6 font-extrabold text-center text-heading">Create your account</h1>
      
      <form class="mt-8 space-y-4" @submit.prevent="handleRegister" aria-labelledby="register-heading">
        <AuthFormField id="email-address" name="email" type="email" label="Email address" icon="envelope" placeholder="Email address" autocomplete="email" 
        v-model="formData.email" :errorMessage="errors.email" :hasError="!!errors.email" fieldClass="form-field-1" @blur="validateField('email')" @update:modelValue="validateField('email')"/>
        <AuthFormField id="username" name="username" type="text" label="Username" icon="user" placeholder="Username (3-30 characters)" autocomplete="username" 
        v-model="formData.username" :errorMessage="errors.username" :hasError="!!errors.username" fieldClass="pt-px form-field-2" @blur="validateField('username')" @update:modelValue="validateField('username')"/>
        <div class="form-field-3">
          <AuthFormField id="password" name="password" type="password" label="Password" icon="lock" placeholder="Password" autocomplete="new-password" 
          v-model="formData.password" :errorMessage="errors.password" :hasError="!!errors.password" @blur="validateField('password')" @update:modelValue="validateField('password')">
            <p v-if="!errors.password && !passwordStrength" class="text-text-muted mt-1 h">Password must be at least 6 characters long.</p>
          </AuthFormField>

          <PasswordStrengthIndicator v-if="formData.password && !errors.password" :password="formData.password" />
        </div>
        <AuthErrorMessage :message="generalError" />
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
import { getRandomProfileImage } from '~/utils/imageUtils/randomImageUtil'
import { handleAuthError, handleDatabaseError } from '~/utils/errorHandler'
import { calculatePasswordStrength, validatePassword } from '~/utils/passwordUtils'
import useFormValidation from '~/composables/useFormValidation'
import PasswordStrengthIndicator from '~/components/auth/PasswordStrengthIndicator.vue'
import { defaultSettings } from '~/composables/useUserSettings'
import { useSettingsManager } from '~/composables/useSettingsManager'
import { serverCache } from '~/utils/storageUtils/cacheUtil'
import { profileCache } from '~/utils/storageUtils/cacheUtil'

definePageMeta({ layout: 'auth' })

const registrationSchema = {
  email: userSchema.shape.email,
  username: userSchema.shape.username,
  password: {
    safeParse: (value: string) => {
      const validation = validatePassword(value);
      if (!validation.valid) {
        return { 
          success: false, 
          error: { errors: [{ message: validation.message }] }
        };
      }
      return { success: true };
    }
  }
}

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

const focusFirstError = () => {
  nextTick(() => {
    const firstErrorField = Object.keys(errors).find(key => !!errors[key]);
    if (firstErrorField) {
      const element = document.getElementById(firstErrorField);
      if (element) element.focus();
    }
  });
};

const handleRegister = async () => {
  validateAllFields()
  if (!isFormValid.value) {
    focusFirstError()
    return
  }
  
  // Prevent multiple submissions
  if (loading.value) {
    return;
  }
  
  generalError.value = ''
  try {
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
    
    try {
      const { auth } = useFirebase()
      const uid = auth.currentUser?.uid
      
      if (!uid) throw new Error('User ID not found after registration')
      
      const visitorSettingsManager = useSettingsManager('visitor');
      const visitorPrefs = visitorSettingsManager.visitorSettings.value;
      
      const mergedSettings = {
        ...defaultSettings,
        appearance: {
          ...defaultSettings.appearance,
          ...(visitorPrefs?.appearance?.theme && { theme: visitorPrefs.appearance.theme })
        },
        accessibility: {
          ...defaultSettings.accessibility,
          ...(visitorPrefs?.accessibility && visitorPrefs.accessibility)
        }
      };
      
      const userData = {
        id: uid,
        username: formData.username,
        email: formData.email,
        profile_image_url: window.location.origin + getRandomProfileImage(),
        bio: '',
        servers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {
          userPreferences: mergedSettings
        },
        components: {}
      }

      const userValidation = safeValidateUser(userData)
      if (!userValidation.success) {
        throw new Error(`Invalid user data: ${JSON.stringify(userValidation.error)}`)
      }
      
      await setDoc(doc(firestore, 'users', uid), userData)
      
      // Initialize caches for the new user
      // This prevents redundant loading attempts that would all show "not found"
      serverCache.saveServerList(uid, []); // Cache empty server list
      profileCache.saveProfileData(uid, userData); // Cache user profile
      
      showToast('Registration successful! Please check your email to verify your account.', 'success', 3000)
      
      // Keep loading state active during navigation
      navigateTo('/dashboard')
      
      // The loading state will stay true until navigation completes or timeout occurs
      return;
    } catch (err) {
      generalError.value = handleDatabaseError(err)
      loading.value = false
    }
  } catch (error) {
    generalError.value = handleAuthError(error)
    loading.value = false
  } finally {
    // Only clear the timeout if we've set loading to false elsewhere
    if (!loading.value && loadingTimeout.value) {
      clearTimeout(loadingTimeout.value)
      loadingTimeout.value = null
    }
  }
}
</script>