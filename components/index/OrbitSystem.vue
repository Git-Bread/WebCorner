<template>
  <div v-if="animationControl.animationsEnabled.value" class="relative w-full h-[800px] mt-4 mb-4 z-10 overflow-visible" aria-hidden="true">
    <div class="central-orb shadow-xl">
      <div class="central-orb-logo">
        <img src="../../public/images/Logo.png" alt="WebCorner Logo" class="w-[90px] h-[90px]" />
      </div>
    </div>
    <div class="orbit-inner shadow-sm"></div>
    
    <div class="orbital-system orbital-system-1">
      <div class="server-icon medium-orb">
        <fa :icon="['fas', 'server']" class="text-5xl text-theme-primary" aria-hidden="true" />
      </div>
      <div class="satellite-orbit">
        <div class="satellite satellite-pulse-1">
          <img src="../../public/images/Profile_Pictures/bear_profile.webp" alt="Bear profile picture" class="w-full h-full rounded-full object-cover" />
        </div>
        <div class="satellite satellite-pulse-1">
          <img src="../../public/images/Profile_Pictures/coldfox_profile.webp" alt="Cold Fox profile picture" class="w-full h-full rounded-full object-cover" />
        </div>
        <div class="satellite satellite-pulse-1">
          <img src="../../public/images/Profile_Pictures/fox_profile.webp" alt="Fox profile picture" class="w-full h-full rounded-full object-cover" />
        </div>
        <div class="satellite satellite-pulse-1">
          <img src="../../public/images/Profile_Pictures/eagle_profile.webp" alt="Eagle profile picture" class="w-full h-full rounded-full object-cover" />
        </div>
      </div>
    </div>
    
    <div class="orbital-system orbital-system-2">
      <div class="server-icon medium-orb">
        <fa :icon="['fas', 'server']" class="text-5xl text-theme-primary" aria-hidden="true" />
      </div>
      <div class="satellite-orbit satellite-orbit-2">
        <div class="satellite satellite-2 satellite-pulse-2">
          <img src="../../public/images/Profile_Pictures/owl_profile.webp" alt="Owl profile picture" class="w-full h-full rounded-full object-cover" />
        </div>
        <div class="satellite satellite-2 satellite-pulse-2">
          <img src="../../public/images/Profile_Pictures/parrot_profile.webp" alt="Parrot profile picture" class="w-full h-full rounded-full object-cover" />
        </div>
        <div class="satellite satellite-2 satellite-pulse-2">
          <img src="../../public/images/Profile_Pictures/hippo_profile.webp" alt="Hippo profile picture" class="w-full h-full rounded-full object-cover" />
        </div>
        <div class="satellite satellite-2 satellite-pulse-2">
          <img src="../../public/images/Profile_Pictures/hare_profile.webp" alt="Hare profile picture" class="w-full h-full rounded-full object-cover" />
        </div>
        <div class="satellite satellite-2 satellite-pulse-2">
          <img src="../../public/images/Profile_Pictures/orangebird_profile.webp" alt="Orange Bird profile picture" class="w-full h-full rounded-full object-cover" />
        </div>
      </div>
    </div>
    
    <div class="orbital-system orbital-system-3">
      <div class="server-icon medium-orb">
        <fa :icon="['fas', 'server']" class="text-5xl text-theme-primary" aria-hidden="true" />
      </div>
      <div class="satellite-orbit satellite-orbit-3">
        <div class="satellite satellite-3 satellite-pulse-3">
          <img src="../../public/images/Profile_Pictures/deer_profile.webp" alt="Deer profile picture" class="w-full h-full rounded-full object-cover" />
        </div>
        <div class="satellite satellite-3 satellite-pulse-3">
          <img src="../../public/images/Profile_Pictures/bluebird_profile.webp" alt="Blue Bird profile picture" class="w-full h-full rounded-full object-cover" />
        </div>
        <div class="satellite satellite-3 satellite-pulse-3">
          <img src="../../public/images/Profile_Pictures/owl_profile.webp" alt="Owl profile picture" class="w-full h-full rounded-full object-cover" />
        </div>
        <div class="satellite satellite-3 satellite-pulse-3">
          <img src="../../public/images/Profile_Pictures/hare_profile.webp" alt="Hare profile picture" class="w-full h-full rounded-full object-cover" />
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
import { onMounted, onBeforeUnmount } from 'vue';
import SatellitePulse from '../../assets/ts/animation/satellite-pulse';
import { animationControl } from '~/composables/decorative/useAnimationControl';

const emit = defineEmits<{
  (e: 'satellitePulse', data: { profileImage: string, type: string }): void
}>();

const pulseController = SatellitePulse.setup();
let unregisterAnimation: (() => void) | null = null;

onMounted(() => {
  unregisterAnimation = animationControl.registerAnimation({
    start: pulseController.startAnimations,
    stop: pulseController.stopAnimations
  });
  
  if (animationControl.animationsEnabled.value) pulseController.startAnimations();
  
  pulseController.on('satellitePulse', (data: { profileImage: string, type: string }) => {
    emit('satellitePulse', data);
  });
});

onBeforeUnmount(() => {
  pulseController.stopAnimations();
  if (unregisterAnimation) unregisterAnimation();
});
</script>