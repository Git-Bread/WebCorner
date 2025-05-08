<template>
  <teleport to="body">
    <div 
      v-if="member"
      class="member-profile-popup bg-surface p-4 rounded-md shadow-md border border-border z-50"
      :class="{ 'visible': isVisible }"
      :style="popupStyle"
      style="position: absolute; width: 280px; min-height: 200px;"
    >
      <div class="flex flex-col">
        <!-- Profile Image - Centered -->
        <div class="flex justify-center mb-3">
          <div 
            class="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden"
            :class="member.profileImage ? '' : 'bg-theme-primary text-background'"
          >
            <img 
              v-if="member.profileImage"
              :src="member.profileImage"
              :alt="member.displayName || 'User'"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-2xl">{{ getUserInitial(member.displayName) }}</span>
          </div>
        </div>
        
        <!-- Username with Role Badge - Centered -->
        <div class="flex items-center justify-center mb-3">
          <h3 class="text-lg font-medium text-heading">{{ member.displayName }}</h3>
          <fa 
            v-if="member.role === 'owner'" 
            :icon="['fas', 'crown']" 
            class="text-theme-primary ml-2 text-sm"
            title="Server Owner"
          />
          <fa 
            v-else-if="member.role === 'admin'" 
            :icon="['fas', 'shield-alt']" 
            class="text-accent-1 ml-2 text-sm"
            title="Admin"
          />
        </div>
        
        <!-- Bio - Left aligned with icon -->
        <div class="flex items-start mb-3">
          <fa :icon="['fas', 'book-open']" class="text-theme-primary mr-2 mt-0.5 flex-shrink-0" />
          <p class="text-sm text-text break-words">
            {{ member.bio || 'No bio available' }}
          </p>
        </div>
        
        <!-- Email - Left aligned with icon -->
        <div v-if="member.email" class="flex items-center">
          <fa :icon="['fas', 'envelope']" class="text-theme-primary mr-2 flex-shrink-0" />
          <p class="text-sm text-text truncate">{{ member.email }}</p>
        </div>
        
        <!-- Close button -->
        <button 
          @click.stop="$emit('close')" 
          class="absolute top-2 right-2 text-xs text-text-muted hover:text-error"
        >
          <fa :icon="['fas', 'times']" />
        </button>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import type { ServerMember } from '~/composables/server/useServerMembers';

const props = defineProps({
  member: {
    type: Object as () => ServerMember,
    required: true
  },
  isVisible: {
    type: Boolean,
    default: false
  },
  popupStyle: {
    type: Object,
    default: () => ({})
  }
});

defineEmits(['close']);

// Helper function to get user initials
const getUserInitial = (displayName?: string): string => {
  return displayName ? displayName.charAt(0).toUpperCase() : 'U';
};
</script>