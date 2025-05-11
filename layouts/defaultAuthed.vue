<template>
    <div class="flex flex-col min-h-screen bg-gradient-page">
        <HeadersStandardHeader />
        <main class="flex-grow">
            <slot />
        </main>
        <StandardFooter />

        <!-- Settings Button for authenticated users -->
        <button 
            @click="showUserSettings = !showUserSettings" 
            class="fixed bottom-4 right-8 z-40 p-3 bg-theme-primary text-background rounded-full shadow-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary"
            aria-label="Toggle settings">
            <fa :icon="['fas', 'cog']" class="w-5 h-5" />
        </button>
        
        <!-- Settings Component for authenticated users -->
        <Transition name="fade-slide-up">
            <SettingsMenu 
                v-if="showUserSettings" 
                mode="user" 
                @close-settings="showUserSettings = false" />
        </Transition>
        
    </div>
</template>

<script setup lang="ts">
import { HeadersStandardHeader } from '#components'
import { ref } from 'vue';
import SettingsMenu from '~/components/userComponents/SettingsMenu.vue';

const showUserSettings = ref(false);
</script>