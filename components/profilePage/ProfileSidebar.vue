<template>
  <div>
    <!-- Profile card -->
    <div class="bg-background shadow-lg rounded-lg p-6 mb-6 form-fade-in">
      <div class="flex flex-col items-center">
        <!-- Profile Picture with proper handling -->
        <div class="w-36 h-36 rounded-full overflow-hidden mb-4 border-2 border-theme-primary relative group">
          <img :src="userPhotoUrl" :alt="`${userName}'s profile picture`" class="w-full h-full object-cover" />
          
          <div class="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" @click="$emit('openImageSelector')">
            <span class="text-white text-sm font-medium">Change picture</span>
          </div>
        </div>
        
        <h2 class="text-xl font-semibold text-heading mb-1">{{ userName }}</h2>
        <p class="text-text-muted text-sm mb-4">{{ userEmail }}</p>
        
        <button class="w-full bg-theme-primary text-background px-4 py-2 rounded text-sm hover:bg-theme-secondary transition duration-200 mb-2 flex items-center justify-center" @click="$emit('toggleEditing')">
          <fa :icon="['fas', isEditing ? 'times' : 'pen']" class="mr-2" />
          {{ isEditing ? 'Cancel Editing' : 'Edit Profile' }}
        </button>
        
        <NuxtLink to="/dashboard" class="w-full border border-border text-text px-4 py-2 rounded text-sm text-center hover:bg-surface transition duration-200 flex items-center justify-center">
          <fa :icon="['fas', 'arrow-left']" class="mr-2" />
          Back to Dashboard
        </NuxtLink>
      </div>
    </div>
    
    <!-- User stats card -->
    <div class="bg-background shadow-lg rounded-lg p-6 form-fade-in animation-delay-200">
      <h3 class="font-medium text-heading mb-4 pb-2 border-b border-border">Account Stats</h3>
      
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <span class="text-text-muted">Member since</span>
          <span class="text-text font-medium">{{ creationTime }}</span>
        </div>
        
        <div class="flex justify-between items-center">
          <span class="text-text-muted">Last sign in</span>
          <span class="text-text font-medium">{{ lastSignInTime }}</span>
        </div>
        
        <div class="flex justify-between items-center">
          <span class="text-text-muted">Profile completed</span>
          <div class="flex items-center">
            <div class="w-24 bg-surface rounded-full h-2 mr-2">
              <div class="bg-theme-primary h-2 rounded-full" :style="{width: `${profileCompletionPercentage}%`}"></div>
            </div>
            <span class="text-text font-medium">{{ profileCompletionPercentage }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  userName: string;
  userEmail: string | null;
  userPhotoUrl: string;
  isEditing: boolean;
  creationTime: string;
  lastSignInTime: string;
  profileCompletionPercentage: number;
}>();

defineEmits<{
  (e: 'toggleEditing'): void;
  (e: 'openImageSelector'): void;
}>();
</script>