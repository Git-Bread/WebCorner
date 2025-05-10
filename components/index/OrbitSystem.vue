<template>
  <div v-if="animationControl.animationsEnabled.value" class="relative w-full h-[800px] mt-4 mb-4 z-10 overflow-visible" aria-hidden="true">
    <div class="central-orb shadow-xl">
      <div class="central-orb-logo">
        <img src="/images/Logo.png" alt="WebCorner Logo" class="w-[90px] h-[90px]" loading="lazy" />
      </div>
    </div>
    <div class="orbit-inner shadow-sm"></div>
    
    <div class="orbital-system orbital-system-1">
      <div class="server-icon medium-orb">
        <fa :icon="['fas', 'server']" class="text-5xl text-theme-primary" aria-hidden="true" />
      </div>
      <div class="satellite-orbit">
        <div v-for="image in orbit1Images" :key="image.src" class="satellite satellite-pulse-1">
          <img :src="image.src" :alt="image.alt" class="w-full h-full rounded-full object-cover" loading="lazy" />
        </div>
      </div>
    </div>
    
    <div class="orbital-system orbital-system-2">
      <div class="server-icon medium-orb">
        <fa :icon="['fas', 'server']" class="text-5xl text-theme-primary" aria-hidden="true" />
      </div>
      <div class="satellite-orbit satellite-orbit-2">
        <div v-for="image in orbit2Images" :key="image.src" class="satellite satellite-2 satellite-pulse-2">
          <img :src="image.src" :alt="image.alt" class="w-full h-full rounded-full object-cover" loading="lazy" />
        </div>
      </div>
    </div>
    
    <div class="orbital-system orbital-system-3">
      <div class="server-icon medium-orb">
        <fa :icon="['fas', 'server']" class="text-5xl text-theme-primary" aria-hidden="true" />
      </div>
      <div class="satellite-orbit satellite-orbit-3">
        <div v-for="image in orbit3Images" :key="image.src" class="satellite satellite-3 satellite-pulse-3">
          <img :src="image.src" :alt="image.alt" class="w-full h-full rounded-full object-cover" loading="lazy" />
        </div>
      </div>
    </div>
  </div>
  <div v-else class="w-full py-12 text-center">
    <div class="bg-background rounded-lg p-8 shadow-md border border-border inline-block">
      <fa :icon="['fas', 'satellite']" class="text-theme-primary text-4xl mb-3" aria-hidden="true" />
      <p class="text-text">Orbit visualization is hidden for improved accessibility.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import SatellitePulse from '../../assets/ts/animation/satellite-pulse';
import { animationControl } from '~/composables/decorative/useAnimationControl';

// Define image interfaces for better type safety
interface ProfileImage {
  src: string;
  alt: string;
}

// Define orbit images as reactive arrays to enable reuse
const orbit1Images = ref<ProfileImage[]>([
  { src: '/images/Profile_Pictures/bear_profile.webp', alt: 'Bear profile picture' },
  { src: '/images/Profile_Pictures/coldfox_profile.webp', alt: 'Cold Fox profile picture' },
  { src: '/images/Profile_Pictures/fox_profile.webp', alt: 'Fox profile picture' },
  { src: '/images/Profile_Pictures/eagle_profile.webp', alt: 'Eagle profile picture' }
]);

const orbit2Images = ref<ProfileImage[]>([
  { src: '/images/Profile_Pictures/owl_profile.webp', alt: 'Owl profile picture' },
  { src: '/images/Profile_Pictures/parrot_profile.webp', alt: 'Parrot profile picture' },
  { src: '/images/Profile_Pictures/hippo_profile.webp', alt: 'Hippo profile picture' },
  { src: '/images/Profile_Pictures/hare_profile.webp', alt: 'Hare profile picture' },
  { src: '/images/Profile_Pictures/orangebird_profile.webp', alt: 'Orange Bird profile picture' }
]);

const orbit3Images = ref<ProfileImage[]>([
  { src: '/images/Profile_Pictures/deer_profile.webp', alt: 'Deer profile picture' },
  { src: '/images/Profile_Pictures/bluebird_profile.webp', alt: 'Blue Bird profile picture' },
  { src: '/images/Profile_Pictures/owl_profile.webp', alt: 'Owl profile picture' },
  { src: '/images/Profile_Pictures/hare_profile.webp', alt: 'Hare profile picture' }
]);

const emit = defineEmits<{
  (e: 'satellitePulse', data: { profileImage: string, type: 'blue' | 'purple' | 'pink' }): void
}>();

const pulseController = SatellitePulse.setup();
let unregisterAnimation: (() => void) | null = null;

onMounted(() => {
  // Pre-load images to improve performance
  orbit1Images.value.concat(orbit2Images.value, orbit3Images.value).forEach(image => {
    const img = new Image();
    img.src = image.src;
  });

  unregisterAnimation = animationControl.registerAnimation({
    start: pulseController.startAnimations,
    stop: pulseController.stopAnimations
  });
  
  if (animationControl.animationsEnabled.value) pulseController.startAnimations();
  
  pulseController.on('satellitePulse', (data: { profileImage: string; type: 'blue' | 'purple' | 'pink'; }) => {
    if (data.profileImage) {
      emit('satellitePulse', {
        profileImage: data.profileImage,
        type: data.type
      });
    }
  });
});

onBeforeUnmount(() => {
  pulseController.stopAnimations();
  if (unregisterAnimation) unregisterAnimation();
});
</script>