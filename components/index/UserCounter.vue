<template>
  <section ref="counterSection" class="w-full z-10 py-16 mb-32 md:py-24 bg-gradient-page" aria-labelledby="user-stats-heading">
    <div class="container mx-auto px-4 text-center">
      <h2 id="user-stats-heading" class="font-bold mb-4 text-heading">Join our growing community</h2>
      <h3 class="mb-10 text-text max-w-2xl mx-auto">People from around the world trust WebCorner for their team collaboration needs.</h3>
      
      <div class="flex flex-col items-center">
        <div class="flex items-baseline">
          <span 
            class="text-5xl md:text-7xl font-bold text-theme-primary" 
            aria-live="polite" 
            :aria-label="`Current user count: ${isLoading ? 'Loading' : formattedCount}`"
          >
            {{ isLoading ? '...' : formattedCount }}
          </span>
          <span class="text-2xl md:text-3xl ml-2 text-heading">users</span>
        </div>
        <p v-if="isLoading" class="mt-2 text-text-muted flex items-center">
          <fa :icon="['fas', 'spinner']" class="animate-spin mr-2" aria-hidden="true" />
          <span>Counting users...</span>
        </p>
        <p v-else-if="error" class="mt-2 text-error" role="alert">
          {{ error.message || "Couldn't load latest count. Showing estimate." }}
        </p>
        <h4 v-else class="mt-4 text-text">and growing every day!</h4>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useFirestoreCounter } from '~/composables/decorative/useFirestoreCounter';

const { formattedCount, isLoading, error, fetchCount, startAnimation, cleanup } = useFirestoreCounter('users');
const counterSection = ref<HTMLElement | null>(null);
const hasAnimated = ref(false);
let observer: IntersectionObserver | null = null;

// Prefetch data but don't animate yet
const prefetchData = async () => {
  try {
    // Fetch data with animation disabled
    await fetchCount(15236, false);
  } catch (err) {
    console.error('Error prefetching counter data:', err);
  }
};

// Called when the counter section enters the viewport
const handleIntersection = (entries: IntersectionObserverEntry[]) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !hasAnimated.value) {
      // Start the animation when element is in view
      startAnimation();
      hasAnimated.value = true;
      
      // Disconnect observer once animation has started
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }
  });
};

onMounted(() => {
  // Start by just loading the data without animation
  prefetchData();
  
  // Setup intersection observer to watch when counter comes into view
  if (counterSection.value && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(handleIntersection, {
      root: null, // use viewport
      threshold: 0.3 // trigger when 30% visible
    });
    
    observer.observe(counterSection.value);
  } else {
    // Fallback for browsers without IntersectionObserver support
    startAnimation();
  }
});

// Ensure cleanup when component unmounts
onBeforeUnmount(() => {
  if (cleanup) cleanup();
  
  // Clean up the observer
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});
</script>