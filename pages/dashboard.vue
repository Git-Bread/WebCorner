<template>
  <div>
    <h1 class="font-bold text-center mb-4">Dashboard</h1>
    <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div class="bg-white shadow-lg rounded-lg p-6 max-w-2xl w-full">
        <h2 class="font-semibold mb-4">Welcome to the Dashboard</h2>
        <p class="text-gray-700 mb-4">Here you can manage your settings and view analytics.</p>
        <button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-200">Go to Settings</button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  definePageMeta({ 
    layout: 'default-authed',
  });
</script>