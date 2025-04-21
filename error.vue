<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center px-4">
    <h1 v-if="error?.statusCode === 404" class="text-6xl font-bold text-red-500 mb-4">404</h1>
    <h1 v-else class="text-6xl font-bold text-red-500 mb-4">{{ error?.statusCode }}</h1>

    <h2 v-if="error?.statusCode === 404" class="text-3xl font-semibold text-gray-800 mb-2">Page Not Found</h2>
    <h2 v-else class="text-3xl font-semibold text-gray-800 mb-2">An Error Occurred</h2>

    <p v-if="error?.statusCode === 404" class="text-lg text-gray-600 mb-8 max-w-md">
      Oops! The page you are looking for does not exist. It might have been moved or deleted.
    </p>
    <p v-else class="text-lg text-gray-600 mb-8 max-w-md">
      {{ error?.message || 'Something went wrong.' }}
    </p>

    <button @click="handleErrorClear" class="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors duration-300 text-lg font-medium">Go Back Home</button>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

// Define the props, Nuxt automatically provides the 'error' prop
const props = defineProps({
  error: Object as () => NuxtError
})

// Function to clear the error and navigate home
const handleErrorClear = () => clearError({ redirect: '/' })
</script>