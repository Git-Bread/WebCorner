<template>
  <div class="flex flex-col items-center mb-4 sidebar-fade-in">
    <div class="w-full h-32 rounded-lg flex items-center justify-center overflow-hidden mb-2 transition-shadow duration-300"
         :class="cachedImageUrl ? 'border border-border hover:shadow-md' : 'bg-theme-primary text-background'">
      <!-- Image with simple error handling -->
      <img 
        v-if="cachedImageUrl && !imageLoadError" 
        :src="cachedImageUrl" 
        :alt="serverName" 
        class="w-full h-full object-cover"
        @error="handleImageError"
      />
      <!-- Fallback display when no image or error loading -->
      <span v-else class="text-2xl font-bold">{{ getServerInitial() }}</span>
    </div>
    
    <div class="w-3/4 border-b border-border"></div>
    
    <h2 class="text-lg font-medium text-heading mt-2">{{ serverName }}</h2>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { serverImageCache } from '~/utils/storageUtils/imageCacheUtil';

const props = defineProps<{
  serverName: string;
  serverImageUrl?: string;
}>();

// Track image loading error state
const imageLoadError = ref(false);

// Handle image loading error
const handleImageError = () => {
  imageLoadError.value = true;
  console.warn('Failed to load server image:', props.serverImageUrl);
};

// Use the cached image URL from the utility
const cachedImageUrl = computed(() => {
  // Check for empty strings or invalid URLs
  if (!props.serverImageUrl || props.serverImageUrl === '') return undefined;
  
  try {
    // Check if URL is valid before trying to use it
    new URL(props.serverImageUrl);
    return serverImageCache.getServerImage(props.serverImageUrl);
  } catch (e) {
    console.warn('Invalid server image URL:', props.serverImageUrl);
    return undefined;
  }
});

const getServerInitial = (): string => {
  return props.serverName ? props.serverName.charAt(0).toUpperCase() : '?';
};
</script>