<template>
  <div class="flex flex-col overflow-hidden relative">
    <!-- Hero Section -->
    <section id="nav-section-1" class="min-h-[96vh] flex items-center m-0 p-0">
      <HeroSection />
    </section>

    <!-- Server Section with Orbit System -->
    <section id="nav-section-2" class="min-h-screen flex flex-col justify-center">
      <ServerSection />
      <div class="hidden md:block w-full bg-background z-10 flex-grow">
        <div class="container mx-auto px-4 text-center">
          <div class="relative w-full mx-auto max-w-6xl">
            <div v-if="animationControl.animationsEnabled.value" class="flex flex-col md:flex-row items-center justify-center">
              <!-- Orbit System -->
              <div class="relative w-full md:flex-shrink-0">
                <OrbitSystem @satellite-pulse="handleSatellitePulse" />
              </div>
          
              <!-- Chat Box -->
              <div class="chat-box mb-8 z-10 items-start">
                <ChatBox ref="chatBoxRef" />
              </div>
            </div>
            <div v-else class="py-16 text-center">
              <div class="bg-background rounded-lg p-8 shadow-md border border-border inline-block max-w-xl">
                <div class="flex justify-center mb-4">
                  <fa :icon="['fas', 'users']" class="text-theme-primary text-4xl mr-4" aria-hidden="true" />
                  <fa :icon="['fas', 'comments']" class="text-theme-secondary text-4xl" aria-hidden="true" />
                </div>
                <h3 class="text-heading text-xl font-bold mb-3">Interactive Visualizations Hidden</h3>
                <p class="text-text">The orbit system and chat visualizations are hidden for improved accessibility. You can enable animations in your accessibility settings.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Workflow and dashboard animation -->
    <section id="nav-section-3" class="min-h-screen flex flex-col justify-center">
      <CustomizeWorkflow class="mb-8" />
      <div class="hidden md:block"> 
        <ClientOnly>
          <div v-if="animationControl.animationsEnabled.value" class="flex justify-center flex-grow px-4 my-4 ">
            <DashboardAnimation class="w-full max-w-5xl h-full" />
          </div>
          <div v-else class="py-16 text-center">
            <div class="bg-background rounded-lg p-8 shadow-md border border-border inline-block max-w-xl">
                <div class="flex justify-center mb-4">
                  <fa :icon="['fas', 'users']" class="text-theme-primary text-4xl mr-4" aria-hidden="true" />
                  <fa :icon="['fas', 'comments']" class="text-theme-secondary text-4xl" aria-hidden="true" />
                </div>
                <h3 class="text-heading text-xl font-bold mb-3">Interactive Visualizations Hidden</h3>
              <p class="text-text">The Dashboard visualizations are hidden for improved accessibility. You can enable animations in your accessibility settings.</p>
            </div>
          </div>
        </ClientOnly>
      </div>
    </section>

    <!-- Connect Teams and User Counter -->
    <section id="nav-section-4" class="min-h-screen flex flex-col justify-center">
      <ConnectTeams class="mb-8" />
      <div class="flex-grow flex justify-center items-center px-4">
        <UserCounter class="w-full max-w-5xl" />
      </div>
    </section>

    <!-- Persistent Bouncing Navigation Chevron -->
    <div class="fixed bottom-4 right-16 z-50 flex flex-col items-center">
      <button 
        @click="navigateToNextSection" 
        class="p-3 bg-ui-control rounded-full shadow-lg transition-all duration-300"
        aria-label="Navigate to next section">
        <fa :icon="['fas', isLastSection ? 'chevron-up' : 'chevron-down']" class="text-background animate-bounce" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import OrbitSystem from '../components/index/OrbitSystem.vue';
import ChatBox from '../components/index/ChatBox.vue';
import HeroSection from '../components/index/HeroSection.vue';
import ServerSection from '../components/index/ServerSection.vue';
import CustomizeWorkflow from '../components/index/CustomizeWorkflow.vue';
import UserCounter from '../components/index/UserCounter.vue';
import ConnectTeams from '~/components/index/ConnectTeams.vue';
import DashboardAnimation from '~/components/index/DashboardAnimation.vue';
import { animationControl } from '~/composables/decorative/useAnimationControl';

// Refs for the chat box
const chatBoxRef = ref<InstanceType<typeof ChatBox> | null>(null);

// Define navigation sections
const navigationIds = ['nav-section-1', 'nav-section-2', 'nav-section-3', 'nav-section-4'];
const sections = ref<HTMLElement[]>([]);
const currentSectionIndex = ref(0);

const isLastSection = computed(() => {
  return currentSectionIndex.value === sections.value.length - 1;
});

onMounted(() => {
  // Collect navigation sections
  sections.value = navigationIds
    .map(id => document.getElementById(id))
    .filter(el => el !== null) as HTMLElement[];
  
  // Create separate observers for each section
  sections.value.forEach((section, index) => {
    const sectionObserver = new IntersectionObserver((entries) => {
      // check if it's intersecting
      if (entries[0].isIntersecting && entries[0].intersectionRatio > 0.5) {
        currentSectionIndex.value = index;
      }
    }, { 
      threshold: 0.5, // Consider section visible when 50% is in view
      rootMargin: '0px' // No margin adjustment
    });
    
    sectionObserver.observe(section);
    
    // Store observer in a list for cleanup
    observerRefs.value.push(sectionObserver);
  });
});

// Store all observers for cleanup
const observerRefs = ref<IntersectionObserver[]>([]);

onUnmounted(() => {
  // Disconnect all observers
  observerRefs.value.forEach(observer => observer.disconnect());
  
  // Clean up animation control
  animationControl.cleanup();
});

// Navigate to the next section when chevron is clicked
function navigateToNextSection() {
  const nextIndex = isLastSection.value ? 0 : (currentSectionIndex.value + 1);
  sections.value[nextIndex].scrollIntoView({ behavior: 'smooth' });
}

// Handle satellite pulse events from orbit component
function handleSatellitePulse(data: { profileImage: string, type: 'blue' | 'purple' | 'pink' }) {
  if (chatBoxRef.value) {
    chatBoxRef.value.addMessage({
      profileImage: data.profileImage,
      type: data.type
    });
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

/* Custom animation for the chevron button hover effect */
button:hover .animate-bounce {
  animation-duration: 1s;
}
</style>