<template>
  <div class="default-layout min-h-screen flex flex-col">
    <HeadersNonAuthedHeader />
    <ClientOnly>
    <main class="flex-grow">      
      <!-- Decorative triangles (squares rotated 45deg) that extend offscreen -->
      <div class="absolute inset-0 overflow-hidden" aria-hidden="true" role="presentation">
        <!-- First triangle with hover animation -->
        <div class="absolute w-[1200px] h-[1200px] transform rotate-45 translate-x-1/3 translate-y-1/3 
        bottom-[-300px] right-[-300px] transition-all duration-700 hover:opacity-30 hover:scale-105 bg-accent-1 opacity-40"></div>
        <!-- Second triangle with hover animation -->
        <div class="absolute w-[1100px] h-[1100px] transform rotate-45 translate-x-1/3 translate-y-1/3 
        bottom-[-300px] right-[-300px] transition-all duration-700 hover:opacity-80 hover:scale-105 bg-accent-2 opacity-50"></div>
      </div>
      <slot />
    </main>
    <StandardFooter />
    
    <!-- Settings Button -->
    <button 
      @click="showVisitorSettings = !showVisitorSettings" 
      class="fixed bottom-4 right-4 z-40 p-3 bg-theme-primary text-background rounded-full shadow-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary"
      aria-label="Toggle settings">
      <fa :icon="['fas', 'cog']" class="w-5 h-5" />
    </button>
    
    <!-- Visitor Settings Component -->
    <Transition name="slide-up">
      <SettingsMenu v-if="showVisitorSettings" mode="visitor" @close-settings="showVisitorSettings = false" />
    </Transition>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { HeadersNonAuthedHeader } from '#components';
import SettingsMenu from '~/components/userComponents/SettingsMenu.vue';
import { ref } from 'vue';

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