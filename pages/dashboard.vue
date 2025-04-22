<template>
  <div>
    <h1 class="font-bold text-center mb-4 text-heading">Dashboard</h1>
    <div class="flex flex-col items-center justify-center min-h-screen bg-surface">
      <div class="bg-background shadow-lg rounded-lg p-6 max-w-2xl w-full">
        <h2 class="font-semibold mb-4 text-heading">Welcome to the Dashboard</h2>
        <p class="text-text mb-4">Here you can manage your settings and view analytics.</p>
        <button class="bg-theme-primary text-background px-4 py-2 rounded hover:bg-theme-secondary transition duration-200">Go to Settings</button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  definePageMeta({ 
    layout: 'default-authed',
  });
</script>