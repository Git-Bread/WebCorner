<template>
    <div class="flex flex-col min-h-screen bg-gradient-page">
        <HeadersStandardHeader />
        <main class="flex-grow">
            <!-- Display warning if fetch limit reached -->
            <div v-if="layoutData?.clientFallback" class="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 text-center">
                Layout data was not loaded on the server as expected. Displaying client-side content.
            </div>
            <div v-if="layoutData?.limitReached" class="p-4 bg-red-100 border border-red-400 text-red-700 text-center">
                Application usage limit reached. Data loading is temporarily disabled.
            </div>
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
import { ref, provide } from 'vue';
import SettingsMenu from '~/components/userComponents/SettingsMenu.vue';
import { useAuth } from '~/composables/useAuth';
import { useProfile } from '~/composables/useProfile';
import { useServerCore } from '~/composables/server/useServerCore';
import { useAsyncData } from '#imports';

// Get auth data - this is fundamental and needs to be at the layout level
const { user, isAuthenticated, logout } = useAuth();

// Get the shared profile state using the singleton pattern
// This ensures only one instance of useProfile exists app-wide
const profileState = useProfile();

// Get server core data
const { 
  loadUserServerList, 
  isLoading, 
  isDataLoaded 
} = useServerCore();

// Get server-side data fetching and limit check
const { data: layoutData, status: layoutPending, error: layoutError } = await useAsyncData(
  'layout-initial-data',
  async () => {
    // This block runs ONLY on the server
    if (import.meta.server) {
      console.log('Running useAsyncData for layout-initial-data on server...');
      
      // Dynamically import guard functions ONLY within this server context
      const { 
        isFetchLimitReached, 
        incrementFetchCount, 
        decrementFetchCountIfDue 
      } = await import('~/server/utils/firestoreGuard');
      
      await decrementFetchCountIfDue();
      const limitReached = await isFetchLimitReached();
      
      if (limitReached) {
        console.warn('Fetch limit reached. Skipping initial data load in layout.');
        return { limitReached: true, profileData: null, serverList: null };
      }
      
      console.log('Fetch limit not reached. Proceeding with initial data load...');
      await incrementFetchCount(); // For profile data
      await incrementFetchCount(); // For server list
      
      let fetchedProfileData = null;
      let fetchedServerList = null;
      const currentUserId = user.value?.uid; // Get current user ID

      if (currentUserId) { // Only attempt to fetch if a user is identified
        try {
          // TODO: Implement actual server-side fetch for profile
          // e.g., using Firebase Admin SDK
          console.log(`Placeholder: Fetching profile data server-side for user ${currentUserId}...`);
          fetchedProfileData = { username: `ServerUser-${currentUserId.substring(0,5)}`, bio: 'Fetched during SSR' }; 
          
          // TODO: Implement actual server-side fetch for server list
          console.log(`Placeholder: Fetching server list server-side for user ${currentUserId}...`);
          fetchedServerList = [{ id: 'server1', name: `Server One (SSR) for ${currentUserId.substring(0,5)}` }];
        } catch (fetchError) {
          console.error('Error fetching initial data during SSR:', fetchError);
        }
      } else {
        console.log('No authenticated user during SSR, skipping data fetches.');
      }
      
      return {
        limitReached: false,
        profileData: fetchedProfileData,
        serverList: fetchedServerList
      };
    } else {
      // Should not happen if useAsyncData is configured correctly for server: true
      // but as a fallback, return a default client-side state or nulls
      console.warn('useAsyncData handler for layout ran on client unexpectedly!');
      return { limitReached: false, profileData: null, serverList: null, clientFallback: true };
    }
  },
  { 
    server: true, 
    lazy: false 
  }
);

// --- Integrate fetched data (Example) --- 
// You might need to update the state of useProfile/useServerCore 
// with this server-fetched data if they are still used for client-side reactivity.
const serverCoreState = useServerCore();

if (layoutData.value && !layoutData.value.limitReached && !layoutData.value.clientFallback) {
  // Example: Update profile composable state if needed
  if (layoutData.value.profileData) {
      console.log('SSR Profile Data:', layoutData.value.profileData);
  }
  // Example: Update server list state
  if (layoutData.value.serverList) {
      console.log('SSR Server List:', layoutData.value.serverList);
  }
}

// Provide fetched data or limit status if needed by child components
provide('layoutInitialData', layoutData);
provide('isFetchBlocked', layoutData.value?.limitReached ?? false);

const showUserSettings = ref(false);
</script>