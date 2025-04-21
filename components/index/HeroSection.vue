<template>
  <div ref="heroRootRef" class="relative h-screen w-full overflow-hidden">
    <!-- Background Container -->
    <div class="bg-slate-50 absolute inset-0 z-0" aria-hidden="true">
      <canvas ref="canvasRef" class="absolute inset-0 w-full h-full block"></canvas>
    </div>

    <!-- Settings menu -->
    <div class="absolute top-4 right-4 settings-menu">
      <!-- Cogwheel button -->
      <button @click="settingsOpen = !settingsOpen" aria-label="Animation settings" 
        class="bg-white/70 hover:bg-white text-gray-800 p-3 rounded-full shadow-md transition-all duration-300 hover:scale-110"
        title="Animation settings">
        <fa :icon="['fas', 'cog']" class="text-xl" />
      </button>
      
      <!-- Settings submenu -->
      <div v-if="settingsOpen" 
        class="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg p-4 w-64 animate-fade-in border border-gray-100">
        <div class="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
          <h3 class="font-bold text-gray-800">Animation Settings</h3>
          <button @click="settingsOpen = false" aria-label="Close" class="text-gray-500 hover:text-gray-800">
            <fa :icon="['fas', 'times']" />
          </button>
        </div>
        
        <!-- Particle count -->
        <div class="space-y-3">
          <div>
            <label for="particleCount" class="block text-xs font-medium text-gray-700">
              Particles: {{ settings.particleCount }}
            </label>
            <input id="particleCount" type="range" v-model.number="settings.particleCount" min="50" max="300" step="10"
              class="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-1" />
          </div>
          
          <!-- Max distance -->
          <div>
            <label for="maxDistance" class="block text-xs font-medium text-gray-700">
              Connection: {{ settings.maxDistance }}px
            </label>
            <input id="maxDistance" type="range" v-model.number="settings.maxDistance" min="40" max="150" step="5"
              class="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-1" />
          </div>
          
          <!-- Mouse interaction radius -->
          <div>
            <label for="mouseRadius" class="block text-xs font-medium text-gray-700">
              Mouse Radius: {{ settings.mouseRadius }}px
            </label>
            <input id="mouseRadius" type="range" v-model.number="settings.mouseRadius" min="40" max="150" step="5"
              class="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-1" />
          </div>
          
          <!-- Color settings -->
          <div class="flex items-center justify-between space-x-2">
            <div>
              <label for="particleColor" class="block text-xs font-medium text-gray-700">Particle</label>
              <input id="particleColor" type="color" v-model="settings.mainParticleColor" 
                class="w-8 h-8 rounded border border-gray-200 mt-1 cursor-pointer" />
            </div>
            
            <div>
              <label for="interactionColor" class="block text-xs font-medium text-gray-700">Interaction</label>
              <input id="interactionColor" type="color" v-model="settings.interactionColor" 
                class="w-8 h-8 rounded border border-gray-200 mt-1 cursor-pointer" />
            </div>
          </div>
          
          <!-- Action buttons -->
          <div class="grid grid-cols-2 gap-2 pt-2">
            <button @click="resetSettings" 
              class="bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded-md text-sm transition-colors">
              Reset
            </button>
            <button @click="applySettings" 
              class="bg-accent-blue hover:bg-blue-600 text-white py-1 px-3 rounded-md text-sm transition-colors">
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Content Container -->
    <div class="container mx-auto px-4 h-screen flex-grow flex flex-col justify-center items-center relative z-10">
      <!-- Hero Section -->
      <div class="text-center mb-12" role="banner">
        <h1 id="main-heading" class="text-5xl md:text-7xl font-bold mb-4 animate-title bg-clip-text text-transparent bg-gradient-heading">WebCorner</h1>
        <p class="text-xl md:text-2xl text-text max-w-2xl mx-auto animate-subtitle">Your team's communication hub for seamless collaboration</p>
      </div>

      <!-- Feature Section -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mb-12" role="region" aria-label="Features">
        <div v-for="(feature, index) in features" :key="feature.title"
          class="feature-card bg-white rounded-lg shadow-lg p-6 border border-gray-200 transition-all duration-300"
          :class="{ 'animate-card-1': index === 0, 'animate-card-2': index === 1, 'animate-card-3': index === 2 }">
          <div class="text-4xl mb-4 text-accent-blue" aria-hidden="true">
            <fa :icon="['fas', feature.icon]" class="feature-icon" />
          </div>
          <h3 class="text-xl font-bold mb-2 text-heading">{{ feature.title }}</h3>
          <p class="text-text">{{ feature.description }}</p>
        </div>
      </div>

      <!-- CTA Buttons -->
      <div class="flex flex-col sm:flex-row gap-4 animate-buttons" role="navigation" aria-label="Account options">
        <NuxtLink to="/register" class="cta-button cta-primary px-8 py-3 text-lg font-medium rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform">
          Create your account <fa :icon="['fas', 'server']" class="ml-2" aria-hidden="true" />
        </NuxtLink>
        <NuxtLink to="/login" class="cta-button cta-secondary px-8 py-3 text-lg font-medium rounded-full shadow-md flex items-center justify-center hover:scale-105 transition-transform">
          Sign In <fa :icon="['fas', 'arrow-right']" class="ml-2" aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, watch } from 'vue';
import { ParticleNetwork } from '@/assets/ts/animation/particle-network';

const features = [
  {
    title: 'Create Servers',
    description: 'Build custom communication servers for your team, department, or entire organization with just a few clicks.',
    icon: 'server'
  },
  {
    title: 'Customize Workflow',
    description: 'Tailor your workspace with components, feeds, and customizable permissions for every team member.',
    icon: 'sliders'
  },
  {
    title: 'Connect Teams',
    description: 'Bring your team together with text channels, group-chats, shared-planning and seamless file sharing.',
    icon: 'users-gear'
  }
];

// Settings menu state
const settingsOpen = ref(false);

// Default animation settings
const defaultSettings = {
  particleCount: 150,
  maxDistance: 80,
  mainParticleColor: '#FF0000',
  interactionColor: '#00FFFF',
  mouseRadius: 80
};

// Animation settings - create a copy of default settings
const settings = reactive({...defaultSettings});

// Store user preferences in localStorage
const saveSettings = () => {
  localStorage.setItem('animation-settings', JSON.stringify(settings));
};

// Load saved settings if they exist
const loadSettings = () => {
  const savedSettings = localStorage.getItem('animation-settings');
  if (savedSettings) {
    const parsedSettings = JSON.parse(savedSettings);
    Object.assign(settings, parsedSettings);
  }
};

// Reset settings to defaults
const resetSettings = () => {
  Object.assign(settings, defaultSettings);
  applySettings();
};

const canvasRef = ref<HTMLCanvasElement | null>(null);
const heroRootRef = ref<HTMLDivElement | null>(null);
let particleNetworkInstance: ParticleNetwork | null = null;

const initParticleNetwork = () => {
  const canvas = canvasRef.value;
  const heroRoot = heroRootRef.value;

  if (canvas && heroRoot) {
    try {
      // Instantiate and start the animation controller
      if (particleNetworkInstance) {
        particleNetworkInstance.stop();
      }
      
      particleNetworkInstance = new ParticleNetwork(canvas, heroRoot);
      
      // Apply current settings
      if (particleNetworkInstance) {
        particleNetworkInstance.updateSettings({
          particleCount: settings.particleCount,
          maxDistance: settings.maxDistance,
          mainParticleColor: settings.mainParticleColor,
          interactionColor: settings.interactionColor,
          mouseRadius: settings.mouseRadius
        });
      }
      
      particleNetworkInstance.start();
    } catch (error) {
      console.error("Failed to initialize Particle Network:", error);
    }
  } else {
      console.error("Canvas or Root element not found for Particle Network.");
  }
};

// Apply settings to the animation and save them
const applySettings = () => {
  if (particleNetworkInstance) {
    particleNetworkInstance.updateSettings({
      particleCount: settings.particleCount,
      maxDistance: settings.maxDistance,
      mainParticleColor: settings.mainParticleColor,
      interactionColor: settings.interactionColor,
      mouseRadius: settings.mouseRadius
    });
    
    // Save settings to localStorage
    saveSettings();
  }
};

// Close settings menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (settingsOpen.value && !target.closest('.settings-menu')) {
    settingsOpen.value = false;
  }
};

onMounted(() => {
  // Load saved settings
  loadSettings();
  
  // Initialize particle network with saved settings
  initParticleNetwork();
  
  // Add click outside listener
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  // Stop the animation and clean up resources
  if (particleNetworkInstance) {
    particleNetworkInstance.stop();
    particleNetworkInstance = null;
  }
  
  // Remove click outside listener
  document.removeEventListener('click', handleClickOutside);
});
</script>