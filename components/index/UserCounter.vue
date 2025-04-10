<template>
  <section class="w-full z-10 py-16 mb-32 md:py-24 bg-gradient-to-br from-background to-accent-blue-100" aria-labelledby="user-stats-heading">
    <div class="container mx-auto px-4 text-center">
      <h2 id="user-stats-heading" class="text-3xl md:text-4xl font-bold mb-4 text-heading">Join our growing community</h2>
      <p class="text-lg mb-10 text-text max-w-2xl mx-auto">People from around the world trust WebCorner for their team collaboration needs.</p>
      
      <div class="flex flex-col items-center">
        <div class="flex items-baseline">
          <span class="text-5xl md:text-7xl font-bold text-accent-blue" aria-live="polite">
            {{ isLoading ? '...' : formattedUserCount }}
          </span>
          <span class="text-2xl md:text-3xl ml-2 text-heading">users</span>
        </div>
        <p v-if="isLoading" class="mt-2 text-text-light flex items-center">
          <fa :icon="['fas', 'spinner']" class="animate-spin mr-2" aria-hidden="true" />
          <span>Counting users...</span>
        </p>
        <p v-else class="mt-4 text-text">and growing every day!</p>
      </div>
    </div>
  </section>
  <!-- Decorative triangles (squares rotated 45deg) that extend offscreen -->
  <div class="absolute inset-0 overflow-hidden" aria-hidden="true" role="presentation">
    <!-- First triangle with hover animation -->
    <div class="absolute w-[1000px] h-[1000px] transform rotate-45 translate-x-1/3 translate-y-1/3 
    bottom-[-300px] right-[-300px] transition-all duration-700 hover:opacity-30 hover:scale-105 bg-decoration-1 opacity-40"></div>
    <!-- Second triangle with hover animation -->
    <div class="absolute w-[900px] h-[900px] transform rotate-45 translate-x-1/3 translate-y-1/3 
    bottom-[-300px] right-[-300px] transition-all duration-700 hover:opacity-80 hover:scale-105 bg-decoration-2 opacity-50"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { collection, getCountFromServer } from 'firebase/firestore';

const { firestore } = useFirebase();
const userCount = ref(0);
const isLoading = ref(true);

// Format the user count with thousands separators
const formattedUserCount = computed(() => {
  return userCount.value.toLocaleString();
});

onMounted(async () => {
  try {
    // Get count from Firestore collection
    const usersCollection = collection(firestore, 'users');
    const snapshot = await getCountFromServer(usersCollection);
    
    // Add animation effect - count up from 0
    const targetCount = snapshot.data().count;
    const duration = 2000; // ms
    const start = performance.now();
    
    const animate = (timestamp: number) => {
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      userCount.value = Math.floor(progress * targetCount);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        userCount.value = targetCount;
      }
    };
    
    requestAnimationFrame(animate);
    isLoading.value = false;
  } catch (error) {
    console.error('Error fetching user count:', error);
    // Fallback to a reasonable number if there's an error
    userCount.value = 5000;
    isLoading.value = false;
  }
});
</script>