<template>
  <div class="flex flex-col items-center mb-4 sidebar-fade-in">
    <div class="w-full h-32 rounded-lg flex items-center justify-center overflow-hidden mb-2 transition-shadow duration-300"
         :class="cachedImageUrl ? 'border border-border hover:shadow-md' : 'bg-theme-primary text-background'">
      <img v-if="cachedImageUrl"
           :src="cachedImageUrl"
           :alt="serverName"
           class="w-full h-full object-cover" />
      <span v-else class="text-2xl font-bold">{{ getServerInitial() }}</span>
    </div>
    
    <div class="w-3/4 border-b border-border"></div>
    
    <h2 class="text-lg font-medium text-heading mt-2">{{ serverName }}</h2>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { serverImageCache } from '~/utils/storageUtils/imageCacheUtil';

const props = defineProps<{
  serverName: string;
  serverImageUrl?: string;
}>();

// Use the cached image URL from the utility
const cachedImageUrl = computed(() => {
  return props.serverImageUrl ? serverImageCache.getServerImage(props.serverImageUrl) : undefined;
});

const getServerInitial = (): string => {
  return props.serverName.charAt(0).toUpperCase();
};
</script>