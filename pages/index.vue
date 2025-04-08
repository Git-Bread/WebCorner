<template>
  <div class="min-h-[92vh] flex flex-col bg-gradient-background overflow-hidden relative">
    <!-- Background animated elements -->
    <div class="absolute inset-0 z-0">
      <div class="shape shape-1 bg-gradient-shape-1"></div>
      <div class="shape shape-2 bg-gradient-shape-2"></div>
      <div class="shape shape-3 bg-gradient-shape-3"></div>
    </div>
    
    <!-- Header Section -->
    <div class="container mx-auto px-4 py-16 flex-grow flex flex-col justify-center items-center relative z-10">
      <!-- Hero Section -->
      <div class="text-center mb-12">
        <h1 class="text-5xl md:text-7xl font-bold mb-4 animate-title bg-clip-text text-transparent bg-gradient-heading">WebCorner</h1>
        <p class="text-xl md:text-2xl text-text max-w-2xl mx-auto animate-subtitle">Your team's communication hub for seamless collaboration</p>
      </div>

      <!-- Feature Section -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mb-12">
        <div v-for="(feature, index) in features" :key="feature.title" 
          class="feature-card bg-background rounded-lg shadow-lg p-6"
          :class="{ 'animate-card-1': index === 0, 'animate-card-2': index === 1, 'animate-card-3': index === 2 }">
          <div class="text-4xl mb-4 text-accent-blue">
            <fa :icon="['fas', feature.icon]" class="feature-icon" />
          </div>
          <h3 class="text-xl font-bold mb-2 text-heading">{{ feature.title }}</h3>
          <p class="text-text">{{ feature.description }}</p>
        </div>
      </div>

      <!-- CTA Buttons -->
      <div class="flex flex-col sm:flex-row gap-4 animate-buttons">
        <NuxtLink to="/register" class="cta-button cta-primary px-8 py-3 text-lg font-medium rounded-full shadow-lg flex items-center justify-center">
          Create Your Server <fa :icon="['fas', 'server']" class="ml-2" />
        </NuxtLink>
        <NuxtLink to="/login" class="cta-button cta-secondary px-8 py-3 text-lg font-medium rounded-full shadow-md flex items-center justify-center">
          Sign In <fa :icon="['fas', 'arrow-right']" class="ml-2" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const features = [
  {
    title: 'Create Servers',
    description: 'Build custom communication servers for your team, department, or entire organization with just a few clicks.',
    icon: 'server'
  },
  {
    title: 'Connect Teams',
    description: 'Bring your team together with text channels, group-chats, shared-planning and seamless file sharing.',
    icon: 'users-gear'
  },
  {
    title: 'Customize Workflow',
    description: 'Tailor your workspace with components, feeds, and customizable permissions for every team member.',
    icon: 'sliders'
  }
];
</script>