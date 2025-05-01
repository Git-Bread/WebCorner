<template>
  <div class="default-layout min-h-screen flex flex-col bg-gradient-page">
    <Transition name="fade" mode="out-in">
      <HeadersNonAuthedHeader />
    </Transition>
    <main class="flex-grow">      
      <slot />
    </main>
    <StandardFooter />
    
    <!-- Settings Button for non-authenticated users -->
    <button 
      @click="showVisitorSettings = !showVisitorSettings" 
      class="fixed bottom-4 right-4 z-40 p-3 bg-theme-primary text-background rounded-full shadow-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary"
      aria-label="Toggle settings">
      <fa :icon="['fas', 'cog']" class="w-5 h-5" />
    </button>
    
    <!-- Settings Component for unauthenticated users -->
    <Transition name="fade-slide-up">
      <UserComponentsSettingsMenu 
        v-if="showVisitorSettings" 
        mode="visitor" 
        @close-settings="showVisitorSettings = false" />
    </Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const showVisitorSettings = ref(false);
</script>