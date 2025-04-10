<template>
  <div class="min-h-[92vh] flex flex-col bg-gradient-background overflow-hidden relative">
    <div class="relative w-full mx-auto max-w-6xl"> <!-- Increased max width for orbit + chatbox -->
      <div class="hidden md:flex flex-col md:flex-row items-center justify-center">
        <!-- Orbit System Component -->
        <div class="relative w-full md:flex-shrink-0 mb-8 mt-8">
          <OrbitSystem @satellite-pulse="handleSatellitePulse" />
        </div>
        
        <!-- Chat Box section -->
        <div class="chat-box mb-8 z-10 items-start">
          <ChatBox ref="chatBoxRef" />
        </div>
      </div>
    </div>
    
    <!-- Header Section Component -->
    <div class="flex-grow py-8 md:py-12">
      <HeroSection />
    </div>

    <!-- Full width feature sections -->
    <FeatureSections />
    <UserCounter />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import OrbitSystem from '../components/index/OrbitSystem.vue';
import ChatBox from '../components/index/ChatBox.vue';
import HeroSection from '../components/index/HeroSection.vue';
import FeatureSections from '../components/index/FeatureSections.vue';
import UserCounter from '../components/index/UserCounter.vue';

const chatBoxRef = ref<InstanceType<typeof ChatBox> | null>(null);

// Handle satellite pulse events from orbit component
function handleSatellitePulse(data: { profileImage: string, type: string }) {
  if (chatBoxRef.value) {
    chatBoxRef.value.addMessage(data);
  }
}
</script>

<style scoped>
/*Chat Box Styles*/
.chat-box {
  display: none;
}

/* Needs custom since standard tailwind are not precise enough, due to the fat orbit */
@media (min-width: 1400px) {
  .chat-box {
    display: block;
  }
}
</style>