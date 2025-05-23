<template>
  <div>
    <!-- Profile card -->
    <div class="bg-background shadow-lg rounded-lg p-6 mb-6 form-fade-in">
      <div class="flex flex-col items-center">
        <!-- Profile Picture -->
        <div class="w-36 h-36 rounded-full overflow-hidden mb-4 border-2 border-theme-primary relative group" aria-label="Profile picture">
          <img 
            :src="isEditing && tempProfileImage ? tempProfileImage : userPhotoUrl" 
            :alt="`${userName}'s profile picture`" 
            class="w-full h-full object-cover"
            loading="eager"
          />
        </div>
        
        <h2 class="text-xl font-semibold text-heading mb-1">{{ userName }}</h2>
        <p class="text-text-muted text-sm mb-4">{{ userEmail }}</p>
        
        <button 
          class="w-full bg-theme-primary text-background px-4 py-2 rounded text-sm hover:bg-theme-secondary transition duration-200 mb-2 flex items-center justify-center" 
          @click="toggleEditing"
          :aria-pressed="isEditing"
          :aria-label="isEditing ? 'Cancel profile editing' : 'Edit your profile'"
        >
          <fa :icon="['fas', isEditing ? 'times' : 'pen']" class="mr-2" aria-hidden="true" />
          {{ isEditing ? 'Cancel Editing' : 'Edit Profile' }}
        </button>
        
        <NuxtLink 
          to="/dashboard" 
          class="w-full border border-border text-text px-4 py-2 rounded text-sm text-center hover:bg-surface transition duration-200 flex items-center justify-center"
          aria-label="Return to dashboard"
        >
          <fa :icon="['fas', 'arrow-left']" class="mr-2" aria-hidden="true" /> Back to Dashboard
        </NuxtLink>
      </div>
    </div>
    
    <!-- User stats card -->
    <div class="bg-background shadow-lg rounded-lg p-6 form-fade-in animation-delay-200">
      <h3 class="font-medium text-heading mb-4 pb-2 border-b border-border">Account Stats</h3>
      
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <span class="text-text-muted">Member since</span>
          <span class="text-text font-medium">{{ formattedCreationTime }}</span>
        </div>
        
        <div class="flex justify-between items-center">
          <span class="text-text-muted">Last sign in</span>
          <span class="text-text font-medium">{{ formattedLastSignInTime }}</span>
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
import { computed } from 'vue';
import { formatDate } from '~/utils/dateUtil';

// Define props
const props = defineProps({
  userName: {
    type: String,
    required: true
  },
  userPhotoUrl: {
    type: String,
    default: '/images/Profile_Pictures/default_profile.jpg'
  },
  userEmail: {
    type: String,
    default: ''
  },
  isEditing: {
    type: Boolean,
    required: true
  },
  tempProfileImage: {
    type: String,
    default: ''
  },
  profileCompletionPercentage: {
    type: Number,
    required: true
  },
  creationTime: {
    type: String,
    default: ''
  },
  lastSignInTime: {
    type: String,
    default: ''
  }
});

// Define emits
const emit = defineEmits(['toggle-editing']);

// Format creation and sign-in times
const formattedCreationTime = computed(() => formatDate(props.creationTime));
const formattedLastSignInTime = computed(() => formatDate(props.lastSignInTime));

// Toggle editing state
function toggleEditing() {
  emit('toggle-editing');
}
</script>