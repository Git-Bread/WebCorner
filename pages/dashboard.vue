<template>
  <div>
    <p class="text-2xl font-bold text-center mb-4">Dashboard</p>
    <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div class="bg-white shadow-lg rounded-lg p-6 max-w-2xl w-full">
        <p class="text-lg font-semibold mb-4">Welcome to the Dashboard</p>
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