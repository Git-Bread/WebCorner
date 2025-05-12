<template>
    <div class="flex flex-col min-h-screen bg-gradient-page">
        <HeadersStandardHeader />
        <main class="flex-grow">
            <slot />
        </main>
        <StandardFooter />

        <!-- Settings Button for authenticated users -->
        <button 
            @click="showUserSettings = !showUserSettings" 
            class="fixed bottom-4 right-8 z-40 p-3 bg-theme-primary text-background rounded-full shadow-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary"
            aria-label="Toggle settings">
            <fa :icon="['fas', 'cog']" class="w-5 h-5" />
        </button>
        
        <!-- Settings Component for authenticated users -->
        <Transition name="fade-slide-up">
            <SettingsMenu 
                v-if="showUserSettings" 
                mode="user" 
                @close-settings="showUserSettings = false" />
        </Transition>
        
    </div>
</template>

<script setup lang="ts">
import { HeadersStandardHeader } from '#components'
import { ref, onMounted, provide } from 'vue';
import SettingsMenu from '~/components/userComponents/SettingsMenu.vue';
import { useAuth } from '~/composables/useAuth';
import { useProfile } from '~/composables/useProfile';

// Get auth data - this is fundamental and needs to be at the layout level
const { user, isAuthenticated } = useAuth();

// Get the shared profile state using the singleton pattern
// This ensures only one instance of useProfile exists app-wide
const profileState = useProfile();

// Loading state for profile data
const loadingProfileData = ref(false);

// Load user data on component mount
onMounted(async () => {
  if (isAuthenticated.value) {
    // The singleton will handle initialization logic internally now
    // If data is already loaded or loading is in progress, the singleton handles it
    // We just need to update our local loading state
    loadingProfileData.value = profileState.isLoadingData.value;
    
    // If data isn't loaded yet and not being loaded, trigger the load
    if (!profileState.dataLoaded.value && !profileState.isLoadingData.value) {
      console.debug('[Layout] Triggering profile data load');
      loadingProfileData.value = true;
      await profileState.loadUserData();
      loadingProfileData.value = false;
    } else if (profileState.isLoadingData.value) {
      console.debug('[Layout] Profile data is already being loaded elsewhere');
      // Wait for loading to complete
      const checkLoading = () => {
        if (profileState.isLoadingData.value) {
          setTimeout(checkLoading, 100); // Check again in 100ms
        } else {
          loadingProfileData.value = false;
          console.debug('[Layout] Loading completed elsewhere');
        }
      };
      checkLoading();
    } else {
      console.debug('[Layout] Profile data already loaded, nothing to do');
    }
  }
});

// Provide user profile data to descendant components
// This ensures all child components use the same singleton instance
provide('userProfileData', {
  profileState,
  loadingProfileData
});

const showUserSettings = ref(false);
</script>