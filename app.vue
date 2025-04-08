<template>
  <div>
    <!-- Auth loading overlay -->
    <Transition name="fade">
      <div v-if="isLoading || !authInitialized" 
           class="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div class="text-center">
          <fa :icon="['fas', 'spinner']" class="animate-spin text-4xl text-accent-blue mb-4" />
          <p class="text-text">Loading...</p>
        </div>
      </div>
    </Transition>

    <!-- Main app content -->
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
const { isLoading, authInitialized } = useAuth()
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>