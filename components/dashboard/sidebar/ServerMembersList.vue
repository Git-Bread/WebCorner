<template>
  <div class="space-y-4 max-h-72 overflow-y-auto overflow-x-hidden pb-2">
    <!-- Loading state -->
    <div v-if="isLoadingMembers" class="flex justify-center py-4">
      <div class="w-4 h-4 border-2 border-t-theme-primary rounded-full animate-spin" aria-label="Loading"></div>
    </div>
    
    <template v-else>
      <!-- Admin and Owner Section -->
      <div v-if="adminAndOwnerMembers.length > 0" class="space-y-2 sidebar-fade-in">
        <h4 class="text-xs font-medium text-text-muted uppercase pl-2 mb-3">Admins</h4>
        <div v-for="(member, index) in adminAndOwnerMembers" 
             :key="member.userId" 
             class="flex items-center pl-2 p-0.5 rounded-md hover:bg-background transition-colors duration-300 sidebar-hover-grow relative cursor-pointer member-list-item-trigger w-full"
             :class="getMemberItemClass(index)"
             @click="toggleMemberProfile(member, $event)"
             ref="memberItems"
             role="button"
             :aria-label="`View profile of ${member.displayName || 'Unknown User'}`">
          <div class="w-8 h-8 min-w-[2rem] min-h-[2rem] rounded-full mr-2 flex items-center justify-center overflow-hidden flex-shrink-0"
               :class="member.profileImage ? '' : 'bg-theme-primary text-background'">
            <img v-if="member.profileImage"
                 :src="member.profileImage"
                 :alt="member.displayName || 'User'"
                 class="w-full h-full object-cover"
                 style="aspect-ratio: 1/1;" />
            <span v-else>{{ getUserInitial(member.displayName) }}</span>
          </div>
          <div class="flex-1 min-w-0 flex items-center justify-between">
            <span class="text-text truncate">{{ member.displayName || 'Unknown User' }}</span>
            <fa v-if="member.role === 'owner'" 
                :icon="['fas', 'crown']" 
                class="text-theme-primary ml-1 text-xs flex-shrink-0"
                title="Server Owner" />
            <fa v-else-if="member.role === 'admin'" 
                :icon="['fas', 'shield-alt']" 
                class="text-accent-1 ml-1 text-xs flex-shrink-0"
                title="Admin" />
          </div>
        </div>
      </div>
      
      <!-- Regular Members Section -->
      <div v-if="regularMembers.length > 0" class="space-y-2 sidebar-fade-in">
        <h4 class="text-xs font-medium text-text-muted uppercase pl-2 mb-3">Members</h4>
        <div v-for="(member, index) in regularMembers" 
             :key="member.userId" 
             class="flex items-center pl-2 p-0.5 rounded-md hover:bg-background transition-colors duration-300 sidebar-hover-grow relative cursor-pointer member-list-item-trigger w-full"
             :class="getMemberItemClass(index)"
             @click="toggleMemberProfile(member, $event)"
             ref="memberItems"
             role="button"
             :aria-label="`View profile of ${member.displayName || 'Unknown User'}`">
          <div class="w-8 h-8 min-w-[2rem] min-h-[2rem] rounded-full mr-2 flex items-center justify-center overflow-hidden flex-shrink-0"
               :class="member.profileImage ? '' : 'bg-theme-primary text-background'">
            <img v-if="member.profileImage"
                 :src="member.profileImage"
                 :alt="member.displayName || 'User'"
                 class="w-full h-full object-cover"
                 style="aspect-ratio: 1/1;" />
            <span v-else>{{ getUserInitial(member.displayName) }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-text truncate block">{{ member.displayName || 'Unknown User' }}</span>
          </div>
        </div>
      </div>
      
      <!-- No members message -->
      <div v-if="!adminAndOwnerMembers.length && !regularMembers.length" class="text-text-muted text-sm text-center py-2 sidebar-fade-in">
        No members found
      </div>
    </template>

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
import { watchEffect, ref, onMounted, onUnmounted } from 'vue';
import { useServerMembers } from '~/composables/server';
import type { ServerMember } from '~/composables/server/useServerMembers';
import MemberProfilePopup from './MemberProfilePopup.vue';

const props = defineProps<{
  serverId: string;
}>();

// Directly use the server members composable
const { 
  isLoadingMembers, 
  fetchServerMembers, 
  getUserInitial,
  adminAndOwnerMembers,
  regularMembers
} = useServerMembers();

// UI state management
const selectedMember = ref<ServerMember | null>(null);
const showMemberProfile = ref(false);
const popupStyle = ref({
  top: '0px',
  left: '0px',
});
const memberItems = ref<HTMLElement[]>([]);

// Helper function to determine member item class based on index
const getMemberItemClass = (index: number): string => {
  const classMap = {
    0: 'member-item-1',
    1: 'member-item-2',
    2: 'member-item-3',
    3: 'member-item-4'
  };
  return classMap[index as keyof typeof classMap] || 'member-item-5';
};

const toggleMemberProfile = (member: ServerMember, event: MouseEvent) => {
  const targetElement = event.currentTarget as HTMLElement;
  const rect = targetElement.getBoundingClientRect();
  
  // Calculate position, ensuring the popup stays within viewport
  const viewportWidth = window.innerWidth;
  const popupWidth = 280; // Width of popup from CSS
  
  let left = rect.right + 25;
  // If popup would go off screen, position it to the left of the element instead
  if (left + popupWidth > viewportWidth) {
    left = Math.max(rect.left - popupWidth - 25, 10);
  }
  
  popupStyle.value = {
    top: `${rect.top}px`,
    left: `${left}px`,
  };
  
  if (selectedMember.value && selectedMember.value.userId === member.userId) {
    showMemberProfile.value = !showMemberProfile.value;
  } else {
    selectedMember.value = member;
    showMemberProfile.value = true;
  }
};

const closeMemberProfile = () => {
  showMemberProfile.value = false;
};

const handleClickOutside = (event: MouseEvent) => {
  if (showMemberProfile.value && 
      !(event.target as HTMLElement)?.closest('.member-profile-popup') && 
      !(event.target as HTMLElement)?.closest('.member-list-item-trigger')) {
    showMemberProfile.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  
  if (props.serverId) {
    fetchServerMembers(props.serverId);
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Watch for changes to server ID and fetch members
watchEffect(() => {
  if (props.serverId) {
    fetchServerMembers(props.serverId);
  }
});
</script>