<template>
  <div>
    <div class="container mx-auto py-8 px-4">
      <h1 class="font-bold text-3xl text-center mb-8 text-heading">Dashboard</h1>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- User Profile Card -->
        <div class="bg-background shadow-lg rounded-lg p-6">
          <div class="flex items-center mb-4">
            <div class="w-16 h-16 rounded-full overflow-hidden mr-4 border-2 border-theme-primary">
              <img src="/images/Profile_Pictures/bear_profile.webp" alt="Profile picture" class="w-full h-full object-cover" />
            </div>
            <div>
              <h2 class="font-semibold text-xl text-heading">{{ user?.displayName || 'User' }}</h2>
              <p class="text-text-muted">{{ user?.email }}</p>
            </div>
          </div>
          <NuxtLink to="/profile" class="bg-theme-primary text-background px-4 py-2 rounded block text-center hover:bg-theme-secondary transition duration-200">
            View Profile
          </NuxtLink>
        </div>
        
        <!-- Settings Card -->
        <div class="bg-background shadow-lg rounded-lg p-6">
          <h2 class="font-semibold text-xl mb-4 text-heading">Settings</h2>
          <p class="text-text mb-4">Customize your experience with personal preferences.</p>
          <button class="bg-theme-primary text-background px-4 py-2 rounded hover:bg-theme-secondary transition duration-200">
            Open Settings
          </button>
        </div>
        
        <!-- Analytics Card -->
        <div class="bg-background shadow-lg rounded-lg p-6">
          <h2 class="font-semibold text-xl mb-4 text-heading">Analytics</h2>
          <p class="text-text mb-4">View your activity and usage statistics.</p>
          <button class="bg-theme-primary text-background px-4 py-2 rounded hover:bg-theme-secondary transition duration-200">
            View Analytics
          </button>
        </div>
        
        <!-- Help Card -->
        <div class="bg-background shadow-lg rounded-lg p-6">
          <h2 class="font-semibold text-xl mb-4 text-heading">Help & Support</h2>
          <p class="text-text mb-4">Get help with using our platform and features.</p>
          <button class="bg-theme-primary text-background px-4 py-2 rounded hover:bg-theme-secondary transition duration-200">
            Get Help
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Define page meta with authenticated layout
definePageMeta({ layout: 'default-authed'});

// Get user data from auth composable
const { user } = useAuth();
</script>