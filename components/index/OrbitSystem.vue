<template>
  <div class="relative w-full h-[800px] mt-4 mb-4 z-10 overflow-visible" aria-hidden="true">
    <div class="central-orb shadow-xl">
      <!-- Logo inside central orb -->
      <div class="central-orb-logo">
        <img src="../../public/images/Logo.png" alt="" class="w-[90px] h-[90px]" />
      </div>
    </div>
    <div class="orbit-inner shadow-sm"></div>
    
    <!-- First orbital system - at 0 degrees with blue gradient pulses -->
    <div class="orbital-system orbital-system-1">
      <!-- Server icon -->
      <div class="server-icon medium-orb">
        <fa :icon="['fas', 'server']" class="text-5xl text-theme-primary" />
      </div>
      
      <!-- Satellite orbit ring -->
      <div class="satellite-orbit">
        <div class="satellite satellite-pulse-1">
          <img src="../../public/images/Profile_Pictures/bear_profile.webp" alt="" class="w-full h-full rounded-full object-cover" />
        </div>
        
        <div class="satellite satellite-pulse-1">
          <img src="../../public/images/Profile_Pictures/coldfox_profile.webp" alt="" class="w-full h-full rounded-full object-cover" />
        </div>
        
        <div class="satellite satellite-pulse-1">
          <img src="../../public/images/Profile_Pictures/fox_profile.webp" alt="" class="w-full h-full rounded-full object-cover" />
        </div>
        
        <div class="satellite satellite-pulse-1">
          <img src="../../public/images/Profile_Pictures/eagle_profile.webp" alt="" class="w-full h-full rounded-full object-cover" />
        </div>
      </div>
    </div>
    
    <!-- Second orbital system - at 120 degrees with purple gradient pulses -->
    <div class="orbital-system orbital-system-2">
      <!-- Server icon -->
      <div class="server-icon medium-orb">
        <fa :icon="['fas', 'server']" class="text-5xl text-theme-primary" />
      </div>
      
      <!-- Satellite orbit ring -->
      <div class="satellite-orbit satellite-orbit-2">
        <div class="satellite satellite-2 satellite-pulse-2">
          <img src="../../public/images/Profile_Pictures/owl_profile.webp" alt="" class="w-full h-full rounded-full object-cover" />
        </div>
        
        <div class="satellite satellite-2 satellite-pulse-2">
          <img src="../../public/images/Profile_Pictures/parrot_profile.webp" alt="" class="w-full h-full rounded-full object-cover" />
        </div>
        
        <div class="satellite satellite-2 satellite-pulse-2">
          <img src="../../public/images/Profile_Pictures/hippo_profile.webp" alt="" class="w-full h-full rounded-full object-cover" />
        </div>
        
        <div class="satellite satellite-2 satellite-pulse-2">
          <img src="../../public/images/Profile_Pictures/hare_profile.webp" alt="" class="w-full h-full rounded-full object-cover" />
        </div>
        
        <div class="satellite satellite-2 satellite-pulse-2">
          <img src="../../public/images/Profile_Pictures/orangebird_profile.webp" alt="" class="w-full h-full rounded-full object-cover" />
        </div>
      </div>
    </div>
    
    <!-- Third orbital system - at 240 degrees -->
    <div class="orbital-system orbital-system-3">
      <!-- Server icon -->
      <div class="server-icon medium-orb">
        <fa :icon="['fas', 'server']" class="text-5xl text-theme-primary" />
      </div>
      
      <!-- Satellite orbit ring -->
      <div class="satellite-orbit satellite-orbit-3">
        <div class="satellite satellite-3 satellite-pulse-3">
          <img src="../../public/images/Profile_Pictures/deer_profile.webp" alt="" class="w-full h-full rounded-full object-cover" />
        </div>
        
        <div class="satellite satellite-3 satellite-pulse-3">
          <img src="../../public/images/Profile_Pictures/bluebird_profile.webp" alt="" class="w-full h-full rounded-full object-cover" />
        </div>
        
        <div class="satellite satellite-3 satellite-pulse-3">
          <img src="../../public/images/Profile_Pictures/owl_profile.webp" alt="" class="w-full h-full rounded-full object-cover" />
        </div>
        
        <div class="satellite satellite-3 satellite-pulse-3">
          <img src="../../public/images/Profile_Pictures/hare_profile.webp" alt="" class="w-full h-full rounded-full object-cover" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import SatellitePulse from '../../assets/ts/animation/satellite-pulse';

const emit = defineEmits<{
  (e: 'satellitePulse', data: { profileImage: string, type: string }): void
}>();

const pulseController = SatellitePulse.setup();

// Start animations when component is mounted
onMounted(() => {
  pulseController.startAnimations();
  
  // Listen for satellite pulse events and forward them to parent
  pulseController.on('satellitePulse', (data: { profileImage: string, type: string }) => {
    emit('satellitePulse', data);
  });
});

// Stop animations when component is unmounted
onBeforeUnmount(() => {
  pulseController.stopAnimations();
});
</script>