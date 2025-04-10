<template>
  <div class="flex p-3 rounded-lg bg-background/70 border-l-2 transform transition-all duration-300" :class="[
      isFadingOut ? 'opacity-0' : 'opacity-100', 
      borderColorClass,
      'animate-fadeInFromSide'
    ]">
    <div class="mr-3 flex-shrink-0">
      <img :src="profileImage" class="rounded-full w-10 h-10 object-cover border-2":class="borderColorClass"/>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center mb-1">
        <span class="font-medium text-sm" :class="userColorClass">{{ username }}</span>
        <span class="text-text/50 text-xs ml-2 mt-0.5">{{ formattedTime }}</span>
      </div>
      <div class="text-text text-sm break-words">
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
  return `${hours}:${minutes < 10 ? '0' : ''}${minutes}`;
});

const userColorClass = computed(() => {
  if (props.type === 'blue') return 'text-accent-blue';
  if (props.type === 'purple') return 'text-accent-purple';
  if (props.type === 'pink') return 'text-accent-pink';
  return 'text-accent-blue';
});

const borderColorClass = computed(() => {
  if (props.type === 'blue') return 'border-accent-blue';
  if (props.type === 'purple') return 'border-accent-purple';
  if (props.type === 'pink') return 'border-accent-pink';
  return 'border-accent-blue';
});

onMounted(() => {
  // Start the fade-out animation after 30 seconds
  setTimeout(() => {
    isFadingOut.value = true;
  }, 30000);
});
</script>

<style scoped>
.chat-message {
  display: flex;
  margin-bottom: 16px;
  background-color: rgba(25, 25, 35, 0.7);
  border-radius: 8px;
  padding: 10px;
  border-left: 3px solid transparent;
  animation: slide-in 0.3s ease-out;
  opacity: 1;
  transition: opacity 1s ease-out;
}

.chat-message.fade-out {
  opacity: 0;
}

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
  color: #aaa;
}

.chat-body {
  color: #e1e1e6;
  line-height: 1.4;
}

@keyframes slide-in {
  from {
    transform: translateX(20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.chat-slide-in {
  animation: chat-slide-in 0.3s ease-out;
}

@keyframes chat-slide-in {
  from {
    transform: translateX(20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Add this to your global animations if you want to reuse it */
@keyframes fadeInFromSide {
  from {
    transform: translateX(20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-fadeInFromSide {
  animation: fadeInFromSide 0.3s ease-out;
}
</style>