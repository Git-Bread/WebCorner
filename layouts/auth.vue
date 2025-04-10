<template>
    <div class="default-layout min-h-screen flex flex-col">
      <HeadersNonAuthedHeader />
      <ClientOnly>
      <main class="flex-grow">      
        <!-- Decorative triangles (squares rotated 45deg) that extend offscreen -->
        <div class="absolute inset-0 overflow-hidden" aria-hidden="true" role="presentation">
          <!-- First triangle with hover animation -->
          <div class="absolute w-[1200px] h-[1200px] transform rotate-45 translate-x-1/3 translate-y-1/3 
          bottom-[-300px] right-[-300px] transition-all duration-700 hover:opacity-30 hover:scale-105 bg-decoration-1 opacity-40"></div>
          <!-- Second triangle with hover animation -->
          <div class="absolute w-[1100px] h-[1100px] transform rotate-45 translate-x-1/3 translate-y-1/3 
          bottom-[-300px] right-[-300px] transition-all duration-700 hover:opacity-80 hover:scale-105 bg-decoration-2 opacity-50"></div>
        </div>
        <slot />
      </main>
      <StandardFooter />
      </ClientOnly>
    </div>
  </template>
  
  <script setup lang="ts">
import { HeadersNonAuthedHeader } from '#components';

  
  </script>