<template>
  <div class="py-8 px-4">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold mb-6">Welcome to WebCorner</h1>
      
      <!-- Simplified content without auth logic -->
      <div class="bg-white p-6 rounded-lg shadow-md">
        <p class="mb-4">Welcome to WebCorner!</p>
        <div class="flex gap-4">
          <NuxtLink 
            to="/login" 
            class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Login
          </NuxtLink>
          <NuxtLink 
            to="/register" 
            class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Register
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>