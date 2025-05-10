<template>
  <div ref="heroRootRef" class="relative min-h-screen h-auto w-full overflow-hidden">
    <div class="bg-surface absolute inset-0 z-0" aria-hidden="true">
      <div class="absolute inset-0 particle-backdrop"></div>
      <canvas ref="canvasRef" class="absolute inset-0 w-full h-full block" :class="{ 'hidden': !animationControl.animationsEnabled.value }"></canvas>
    </div>

    <div class="absolute top-4 right-2 sm:right-4 flex space-x-2 z-20 settings-menu">
      <ClientOnly>
        <button @click="toggleDarkMode" aria-label="Toggle dark mode" class="bg-ui-overlay hover:bg-background text-heading p-3 rounded-full shadow-md transition-all duration-300 hover:scale-110" :title="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'">
          <fa :icon="['fas', isDarkMode ? 'sun' : 'moon']" class="text-xl" aria-hidden="true" />
        </button>
      </ClientOnly>
      
      <button @click="settingsOpen = !settingsOpen" aria-label="Animation settings" class="bg-ui-overlay hover:bg-background text-heading p-3 rounded-full shadow-md transition-all duration-300 hover:scale-110" title="Animation settings">
        <fa :icon="['fas', 'cog']" class="text-xl" aria-hidden="true" />
      </button>
      
      <div v-if="settingsOpen" class="absolute top-full right-0 mt-2 bg-background rounded-lg shadow-lg p-4 z-50 w-64 animate-fade-in border border-border">
        <div class="flex justify-between items-center mb-3 pb-2 border-b border-border">
          <h3 class="font-bold text-heading">Animation Settings</h3>
          <button @click="settingsOpen = false" aria-label="Close" class="text-text-muted hover:text-heading">
            <fa :icon="['fas', 'times']" aria-hidden="true" />
          </button>
        </div>
        
        <div class="space-y-3">
          <div>
            <label for="particleCount" class="block font-medium text-heading">Particles: {{ settings.particleCount }}</label>
            <input id="particleCount" type="range" v-model.number="settings.particleCount" min="50" max="300" step="10" class="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer mt-1" />
          </div>
          
          <div>
            <label for="maxDistance" class="block font-medium text-heading">Connection: {{ settings.maxDistance }}px</label>
            <input id="maxDistance" type="range" v-model.number="settings.maxDistance" min="40" max="150" step="5" class="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer mt-1" />
          </div>
          
          <div>
            <label for="mouseRadius" class="block font-medium text-heading">Mouse Radius: {{ settings.mouseRadius }}px</label>
            <input id="mouseRadius" type="range" v-model.number="settings.mouseRadius" min="40" max="150" step="5" class="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer mt-1" />
          </div>
          
          <div class="space-y-3">
            <ColorPresetButtons label="Particle Style" v-model="settings.selectedParticlePreset" :preset-options="particlePresetOptions"/>
            <ColorPresetButtons label="Interaction Style" v-model="settings.selectedInteractionPreset" :preset-options="interactionPresetOptions"/>
          </div>
        </div>
      </div>
    </div>

    <div class="container mx-auto px-4 min-h-screen flex-grow flex flex-col pb-12 justify-center items-center relative z-10">
      <div class="text-center mb-12 pt-20 md:pt-0" role="banner">
        <h1 id="main-heading" class="hidden sm:block font-bold super-large-title animate-title bg-clip-text text-transparent bg-gradient-hero">WebCorner</h1>
        <h3 class="hidden sm:block text-text max-w-2xl mx-auto animate-subtitle mt-0">Your team's communication hub for seamless collaboration</h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mb-12" role="region" aria-label="Features">
        <div v-for="(feature, index) in features" :key="feature.title" class="feature-card bg-background rounded-lg shadow-lg p-6 border border-border transition-all duration-300" :class="{ 'animate-card-1': index === 0, 'animate-card-2': index === 1, 'animate-card-3': index === 2 }">
          <div class="flex items-center mb-3">
            <div class="text-theme-primary mr-3" aria-hidden="true">
              <fa :icon="['fas', feature.icon]" class="feature-icon icon-md" />
            </div>
            <h3 class="font-bold text-heading">{{ feature.title }}</h3>
          </div>
          <p class="text-text">{{ feature.description }}</p>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 animate-buttons" role="navigation" aria-label="Account options">
        <NuxtLink to="/register" class="cta-button bg-theme-tertiary hover:bg-accent-1 text-background px-8 py-3 font-medium rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform">
          <span>Create your account</span> <fa :icon="['fas', 'server']" class="ml-2 mt-0.5" aria-hidden="true" />
        </NuxtLink>
        <NuxtLink to="/login" class="cta-button bg-background border border-theme-primary text-theme-primary px-8 py-3 font-medium rounded-full shadow-md flex items-center justify-center hover:scale-105 transition-transform hover:bg-surface">
          <span>Sign In</span> <fa :icon="['fas', 'arrow-right']" class="ml-2 mt-0.5" aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, watch } from 'vue';
import { ParticleNetwork } from '@/assets/ts/animation/particle-network';
import ColorPresetButtons from '@/components/index/ColorPresetButtons.vue';
import { useSettingsManager } from '@/composables/useSettingsManager';
import { particlePresetOptions, interactionPresetOptions, defaultAnimationSettings, heroFeatures as features, getPresetStyleById } from '@/assets/ts/animation/heroAnimationConstants';
import type { AnimationSettings } from '@/assets/ts/animation/types';
import { animationControl } from '~/composables/decorative/useAnimationControl';

const settingsOpen = ref(false);
const { updateTheme, currentSettings } = useSettingsManager('visitor');
const isDarkMode = ref(currentSettings.value.appearance.theme === 'dark');
const settings = reactive<AnimationSettings>({...defaultAnimationSettings});
const canvasRef = ref<HTMLCanvasElement | null>(null);
const heroRootRef = ref<HTMLDivElement | null>(null);
let particleNetworkInstance: ParticleNetwork | null = null;
let unregisterAnimation: (() => void) | null = null;

const toggleDarkMode = () => {
  const newTheme = isDarkMode.value ? 'light' : 'dark';
  isDarkMode.value = !isDarkMode.value;
  updateTheme(newTheme);
};

const saveSettings = () => {
  const settingsToSave = {
    particleCount: settings.particleCount,
    maxDistance: settings.maxDistance,
    mouseRadius: settings.mouseRadius,
    mainParticleColor: settings.mainParticleColor,
    interactionColor: settings.interactionColor,
    selectedParticlePreset: settings.selectedParticlePreset,
    selectedInteractionPreset: settings.selectedInteractionPreset
  };
  localStorage.setItem('animation-settings', JSON.stringify(settingsToSave));
};

const initParticleNetwork = () => {
  const canvas = canvasRef.value;
  const heroRoot = heroRootRef.value;

  if (canvas && heroRoot) {
    try {
      if (particleNetworkInstance) particleNetworkInstance.stop();
      
      particleNetworkInstance = new ParticleNetwork(canvas, heroRoot);
      particleNetworkInstance.updateSettings({
        particleCount: settings.particleCount,
        maxDistance: settings.maxDistance,
        mouseRadius: settings.mouseRadius,
        mainParticleColor: settings.mainParticleColor,
        interactionColor: settings.interactionColor
      });
      
      if (unregisterAnimation) unregisterAnimation();
      
      unregisterAnimation = animationControl.registerAnimation({
        start: () => particleNetworkInstance?.start(),
        stop: () => particleNetworkInstance?.stop()
      });
      
      if (animationControl.animationsEnabled.value) particleNetworkInstance.start();
    } catch (error) {
      console.error("Failed to initialize Particle Network:", error);
    }
  }
};

const applySettings = () => {
  if (particleNetworkInstance) {
    particleNetworkInstance.updateSettings({
      particleCount: settings.particleCount,
      maxDistance: settings.maxDistance,
      mainParticleColor: settings.mainParticleColor,
      interactionColor: settings.interactionColor,
      mouseRadius: settings.mouseRadius
    });
    saveSettings();
  }
};

watch(() => settings.particleCount, applySettings);
watch(() => settings.maxDistance, applySettings);
watch(() => settings.mouseRadius, applySettings);

watch(() => settings.selectedParticlePreset, (newPresetId) => {
  settings.mainParticleColor = getPresetStyleById(newPresetId, particlePresetOptions);
  applySettings();
}, { immediate: true });

watch(() => settings.selectedInteractionPreset, (newPresetId) => {
  settings.interactionColor = getPresetStyleById(newPresetId, interactionPresetOptions);
  applySettings();
}, { immediate: true });

watch(() => animationControl.animationsEnabled.value, (enabled) => {
  if (!enabled && canvasRef.value && particleNetworkInstance) {
    const ctx = canvasRef.value.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
  }
});

onMounted(() => {
  initParticleNetwork();
  const savedSettings = localStorage.getItem('animation-settings');
  if (savedSettings) {
    const parsedSettings = JSON.parse(savedSettings);
    Object.assign(settings, parsedSettings);
  }
  // Set initial dark mode state based on current theme
  isDarkMode.value = currentSettings.value.appearance.theme === 'dark';
});

onUnmounted(() => {
  if (particleNetworkInstance) {
    particleNetworkInstance.stop();
    particleNetworkInstance = null;
  }
  if (unregisterAnimation) {
    unregisterAnimation();
    unregisterAnimation = null;
  }
});
</script>