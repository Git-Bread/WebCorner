<template>
  <div class="min-h-[90vh] bg-gradient-page py-8 px-4">
    <div class="container mx-auto">
      <!-- Page header with user's name -->
      <ProfileHeader 
        :displayName="(user?.displayName || userName || 'My Profile')" 
      />
      
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <!-- Left sidebar with avatar and quick stats -->
        <div class="lg:col-span-1">
          <ProfileSidebar />
        </div>
        
        <!-- Main content area -->
        <div class="lg:col-span-3">
          <!-- User information form -->
          <PersonalInfoForm />
          
          <!-- Security settings section -->
          <SecuritySettings />
        </div>
      </div>

      <!-- Hidden file input for image upload -->
      <input 
        type="file" 
        ref="fileInput" 
        class="hidden" 
        accept="image/*" 
        @change="handleImageUpload" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showToast } from '~/utils/toast'

// Import components
import ProfileHeader from '~/components/profilePage/ProfileHeader.vue'
import ProfileSidebar from '~/components/profilePage/ProfileSidebar.vue'
import PersonalInfoForm from '~/components/profilePage/PersonalInfoForm.vue'
import SecuritySettings from '~/components/profilePage/SecuritySettings.vue'

// Define page meta
definePageMeta({ layout: 'default-authed' })

// Get auth data and profile composable
const { user } = useAuth()
const { userName, loadUserData } = useProfile()

// Reference to file input for image uploads
const fileInput = ref<HTMLInputElement | null>(null)

// Handle image upload (placeholder - would need actual storage implementation)
function handleImageUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (files && files.length > 0) {
    showToast('Custom image upload not implemented yet', 'info')
    
    // Reset the file input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

// Load user data on component mount
onMounted(async () => {
  await loadUserData()
})
</script>