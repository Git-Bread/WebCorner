<template>
  <div class="space-y-4 max-h-72 overflow-y-auto pb-2"> <!-- Removed 'relative' class -->
    <!-- Loading state -->
    <div v-if="isLoadingMembers" class="flex justify-center py-4">
      <div class="w-4 h-4 border-2 border-t-theme-primary rounded-full animate-spin"></div>
    </div>
    
    <template v-else>
      <!-- Admin and Owner Section -->
      <div v-if="adminAndOwnerMembers.length > 0" class="space-y-2 sidebar-fade-in">
        <h4 class="text-xs font-medium text-text-muted uppercase pl-2 mb-3">Admins</h4>
        <div 
          v-for="(member, index) in adminAndOwnerMembers" 
          :key="member.userId" 
          class="flex items-center pl-2 p-0.5 rounded-md hover:bg-background transition-colors duration-300 sidebar-hover-grow relative cursor-pointer member-list-item-trigger"
          :class="[
            index === 0 ? 'member-item-1' : 
            index === 1 ? 'member-item-2' : 
            index === 2 ? 'member-item-3' :
            index === 3 ? 'member-item-4' : 'member-item-5'
          ]"
          @click="toggleMemberProfile(member, $event)"
          ref="memberItems"
        >
          <div 
            class="w-8 h-8 min-w-[2rem] min-h-[2rem] rounded-full mr-2 flex items-center justify-center overflow-hidden flex-shrink-0"
            :class="member.profileImage ? '' : 'bg-theme-primary text-background'"
          >
            <img 
              v-if="member.profileImage"
              :src="member.profileImage"
              :alt="member.displayName || 'User'"
              class="w-full h-full object-cover"
              style="aspect-ratio: 1/1;"
            />
            <span v-else>{{ getUserInitial(member.displayName) }}</span>
          </div>
          <div class="flex-1 min-w-0 flex items-center justify-between">
            <span class="text-text truncate">{{ member.displayName || 'Unknown User' }}</span>
            <fa 
              v-if="member.role === 'owner'" 
              :icon="['fas', 'crown']" 
              class="text-theme-primary ml-1 text-xs"
              title="Server Owner"
            />
            <fa 
              v-else-if="member.role === 'admin'" 
              :icon="['fas', 'shield-alt']" 
              class="text-accent-1 ml-1 text-xs"
              title="Admin"
            />
          </div>
        </div>
      </div>
      
      <!-- Regular Members Section -->
      <div v-if="regularMembers.length > 0" class="space-y-2 sidebar-fade-in">
        <h4 class="text-xs font-medium text-text-muted uppercase pl-2 mb-3">Members</h4>
        <div 
          v-for="(member, index) in regularMembers" 
          :key="member.userId" 
          class="flex items-center pl-2 p-0.5 rounded-md hover:bg-background transition-colors duration-300 sidebar-hover-grow relative cursor-pointer member-list-item-trigger"
          :class="[
            index === 0 ? 'member-item-1' : 
            index === 1 ? 'member-item-2' : 
            index === 2 ? 'member-item-3' :
            index === 3 ? 'member-item-4' : 'member-item-5'
          ]"
          @click="toggleMemberProfile(member, $event)"
          ref="memberItems"
        >
          <div 
            class="w-8 h-8 min-w-[2rem] min-h-[2rem] rounded-full mr-2 flex items-center justify-center overflow-hidden flex-shrink-0"
            :class="member.profileImage ? '' : 'bg-theme-primary text-background'"
          >
            <img 
              v-if="member.profileImage"
              :src="member.profileImage"
              :alt="member.displayName || 'User'"
              class="w-full h-full object-cover"
              style="aspect-ratio: 1/1;"
            />
            <span v-else>{{ getUserInitial(member.displayName) }}</span>
          </div>
          <span class="text-text truncate w-full">{{ member.displayName || 'Unknown User' }}</span>
        </div>
      </div>
      
      <!-- No members message -->
      <div v-if="!adminAndOwnerMembers.length && !regularMembers.length" class="text-text-muted text-sm text-center py-2 sidebar-fade-in">
        No members found
      </div>
    </template>

    <!-- Member Profile Popup updated to work with teleport -->
    <MemberProfilePopup 
      v-if="selectedMember && showMemberProfile"
      :member="selectedMember"
      :is-visible="showMemberProfile"
      @close="closeMemberProfile"
      :popup-style="popupStyle"
    />
  </div>
</template>

<script setup lang="ts">
import { defineProps, watchEffect, ref, onMounted, onUnmounted } from 'vue';
import { useServerMembers } from '~/composables/server';
import MemberProfilePopup from './MemberProfilePopup.vue';

// Define the proper interface for ServerMember
interface ServerMember {
  userId: string;
  displayName?: string;
  profileImage?: string;
  bio?: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

const props = defineProps<{
  serverId: string;
}>();

const { 
  isLoadingMembers, 
  fetchServerMembers, 
  getUserInitial,
  adminAndOwnerMembers,
  regularMembers
} = useServerMembers();

// Member profile state with proper typing
const selectedMember = ref<ServerMember | null>(null);
const showMemberProfile = ref(false);
const popupStyle = ref({
  top: '0px',
  left: '0px',
});
const memberItems = ref([]);

// Toggle member profile popup with positioning
const toggleMemberProfile = (member: ServerMember, event: MouseEvent) => {
  const targetElement = event.currentTarget as HTMLElement;
  const rect = targetElement.getBoundingClientRect();
  
  // Position popup further to the right of the member item (40px instead of 24px)
  popupStyle.value = {
    top: `${rect.top}px`,
    left: `${rect.right + 25}px`, // Increased spacing to 40px for more distance from the sidebar
  };
  
  if (selectedMember.value && selectedMember.value.userId === member.userId) {
    // If same member clicked, toggle visibility
    showMemberProfile.value = !showMemberProfile.value;
  } else {
    // If different member clicked, show new one
    selectedMember.value = member;
    showMemberProfile.value = true;
  }
};

// Close member profile popup
const closeMemberProfile = () => {
  showMemberProfile.value = false;
};

// Close profile when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (showMemberProfile.value && 
      !(event.target as HTMLElement)?.closest('.member-profile-popup') && 
      !(event.target as HTMLElement)?.closest('.member-list-item-trigger')) {
    showMemberProfile.value = false;
  }
};

// Add and remove event listeners
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Fetch members when serverId changes
watchEffect(() => {
  if (props.serverId) {
    fetchServerMembers(props.serverId);
  }
});
</script>