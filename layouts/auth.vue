<template>
    <div class="default-layout min-h-screen flex flex-col">
      <HeadersNonAuthedHeader />
      <ClientOnly>
      <main class="flex-grow">      
        <slot />
      </main>
      <StandardFooter />
      </ClientOnly>
    </div>
  </template>
  
  <script setup>
import { HeadersNonAuthedHeader } from '#components';

  
  </script>