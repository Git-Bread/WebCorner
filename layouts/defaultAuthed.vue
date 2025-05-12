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
import { useServerCore } from '~/composables/server/useServerCore';

// Get auth data - this is fundamental and needs to be at the layout level
const { user, isAuthenticated } = useAuth();

// Get the shared profile state using the singleton pattern
// This ensures only one instance of useProfile exists app-wide
const profileState = useProfile();

// Get shared server state using the singleton pattern
// This ensures only one instance of useServerCore exists app-wide
const serverState = useServerCore();

// Loading states
const loadingProfileData = ref(false);
const loadingServerData = ref(false);

// Load user data on component mount
onMounted(async () => {
  if (isAuthenticated.value) {
    // Handle profile data loading
    loadingProfileData.value = profileState.isLoadingData.value;
    
    // If data isn't loaded yet and not being loaded, trigger the load
    if (!profileState.dataLoaded.value && !profileState.isLoadingData.value) {
      loadingProfileData.value = true;
      await profileState.loadUserData();
      loadingProfileData.value = false;
    } else if (profileState.isLoadingData.value) {
      // Data is loading somewhere else, just wait for it to complete
      const checkLoading = () => {
        if (profileState.isLoadingData.value) {
          setTimeout(checkLoading, 100); // Check again in 100ms
        } else {
          loadingProfileData.value = false;
        }
      };
      checkLoading();
    }
    
    // Handle server data loading
    // Only load the server list initially, specific server data will be loaded as needed
    loadingServerData.value = serverState.isLoading.value;
    
    // If server data isn't loaded yet and not being loaded, trigger the load
    if (!serverState.isDataLoaded.value && !serverState.isLoading.value) {
      loadingServerData.value = true;
      await serverState.loadUserServerList();
      loadingServerData.value = false;
    } else if (serverState.isLoading.value) {
      // Server data is loading somewhere else, just wait for it to complete
      const checkServerLoading = () => {
        if (serverState.isLoading.value) {
          setTimeout(checkServerLoading, 100); // Check again in 100ms
        } else {
          loadingServerData.value = false;
        }
      };
      checkServerLoading();
    }
  }
});

// Provide user profile data to descendant components
// This ensures all child components use the same singleton instance
provide('userProfileData', {
  profileState,
  loadingProfileData
});

// Provide server data to descendant components
// This ensures all child components use the same singleton instance
provide('userServerData', {
  serverState,
  loadingServerData
});

const showUserSettings = ref(false);
</script>