<template>
  <div class="default-layout min-h-screen flex flex-col">
    <Transition name="fade" mode="out-in">
      <HeadersStandardHeader v-if="isAuthenticated" />
      <HeadersNonAuthedHeader v-else />
    </Transition>
    <main class="flex-grow">      
      <slot />
    </main>
    <StandardFooter />
    
    <!-- Settings Button for non-authenticated users -->
    <button 
      v-if="!isAuthenticated"
      @click="showVisitorSettings = !showVisitorSettings" 
      class="fixed bottom-4 right-4 z-40 p-3 bg-theme-primary text-background rounded-full shadow-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary"
      aria-label="Toggle settings">
      <fa :icon="['fas', 'cog']" class="w-5 h-5" />
    </button>
    
    <!-- Visitor Settings Component -->
    <Transition name="slide-up">
      <VisitorComponentsVisitorSettings v-if="!isAuthenticated && showVisitorSettings" @close-settings="showVisitorSettings = false" />
    </Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const { isAuthenticated } = useAuth();
const showVisitorSettings = ref(false);
</script>

<style>
.slide-up-enter-active, .slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-up-enter-from, .slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>