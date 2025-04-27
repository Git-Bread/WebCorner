<template>
  <div class="flex p-3 rounded-lg bg-ui-overlay border-l-2 transform transition-all duration-300" :class="[
      isFadingOut ? 'fade-out' : 'opacity-100', 
      borderColorClass,
      'animate-slideInFromSide'
    ]">
    <div class="mr-3 flex-shrink-0">
      <img 
        :src="profileImage" 
        class="rounded-full w-10 h-10 object-cover border-2" 
        :class="borderColorClass"
      />
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center mb-1">
        <span class="font-medium" :class="userColorClass">{{ username }}</span> 
        <div class="text-text-muted ml-2 text-sm flex items-center">
          <span>{{ formattedTime }}</span>
        </div>
      </div>
      <div class="text-text break-words text-start">
        {{ message }}
      </div> 
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

const props = defineProps({
  profileImage: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'blue' // 'blue', 'purple', or 'pink'
  },
  message: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  }
});

const isFadingOut = ref(false);
const timestamp = ref(new Date());

const formattedTime = computed(() => {
  const hours = timestamp.value.getHours();
  const minutes = timestamp.value.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12; // Convert to 12-hour format
  return `${formattedHours}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`;
});

const userColorClass = computed(() => {
  if (props.type === 'blue') return 'text-theme-primary';
  if (props.type === 'purple') return 'text-theme-secondary';
  if (props.type === 'pink') return 'text-theme-quaternary';
  return 'text-theme-primary';
});

const borderColorClass = computed(() => {
  if (props.type === 'blue') return 'border-theme-primary';
  if (props.type === 'purple') return 'border-theme-secondary';
  if (props.type === 'pink') return 'border-theme-quaternary';
  return 'border-theme-primary';
});

onMounted(() => {
  setTimeout(() => {
    isFadingOut.value = true;
  }, 30000);
});
</script>

<style scoped>
.chat-avatar {
  margin-right: 12px;
}

.chat-content {
  flex: 1;
}

.chat-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.chat-username {
  font-weight: 600;
  margin-right: 8px;
}

.chat-timestamp {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.chat-body {
  color: var(--color-text);
  line-height: 1.4;
}
</style>