<template>
  <section class="w-full z-10 py-16 mb-32 md:py-24 bg-gradient-to-br from-background to-accent-blue-100" aria-labelledby="user-stats-heading">
    <div class="container mx-auto px-4 text-center">
      <h2 id="user-stats-heading" class="font-bold mb-4 text-heading">Join our growing community</h2>
      <h3 class="mb-10 text-text max-w-2xl mx-auto">People from around the world trust WebCorner for their team collaboration needs.</h3>
      
      <div class="flex flex-col items-center">
        <div class="flex items-baseline">
          <span class="text-5xl md:text-7xl font-bold text-accent-blue" aria-live="polite">
            {{ isLoading ? '...' : formattedCount }}
          </span>
          <span class="text-2xl md:text-3xl ml-2 text-heading">users</span>
        </div>
        <p v-if="isLoading" class="mt-2 text-text-light flex items-center">
          <fa :icon="['fas', 'spinner']" class="animate-spin mr-2" aria-hidden="true" />
          <span>Counting users...</span>
        </p>
        <p v-else-if="error" class="mt-2 text-red-500">
          Couldn't load latest count. Showing estimate.
        </p>
        <h4 v-else class="mt-4 text-text">and growing every day!</h4>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useFirestoreCounter } from '~/composables/decorative/useFirestoreCounter';

const { count, formattedCount, isLoading, error, fetchCount } = useFirestoreCounter('users');

onMounted(() => {
  fetchCount();
});
</script>