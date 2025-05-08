<template>
  <div class="flex flex-col items-center mb-4 sidebar-fade-in">
    <!-- Server Image -->
    <div 
      class="w-full h-32 rounded-lg flex items-center justify-center overflow-hidden mb-2 transition-shadow duration-300"
      :class="serverImageUrl ? 'border border-border hover:shadow-md' : 'bg-theme-primary text-background'"
    >
      <img 
        v-if="serverImageUrl"
        :src="serverImageUrl"
        :alt="serverName"
        class="w-full h-full object-cover"
      />
      <span v-else class="text-2xl font-bold">{{ getServerInitial() }}</span>
    </div>
    
    <!-- Underline -->
    <div class="w-3/4 border-b border-border"></div>
    
    <!-- Server Name -->
    <h2 class="text-lg font-medium text-heading mt-2">{{ serverName }}</h2>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  serverName: string;
  serverImageUrl?: string;
}>();

// Get first letter of server name for server icon
const getServerInitial = (): string => {
  return props.serverName.charAt(0).toUpperCase();
};
</script>