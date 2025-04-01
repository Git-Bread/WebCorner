<template>
    <div>
        <h1 class="text-3xl font-bold mb-6">Test Page</h1>
        <p>This is a test page.</p>
        <div class="flex gap-4 mt-4">
            <NuxtLink to="/login" class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Login</NuxtLink>
            <NuxtLink to="/register" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Register</NuxtLink>
        </div>
    </div>
</template>