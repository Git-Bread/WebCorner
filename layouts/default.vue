<template>
  <div class="default-layout min-h-screen flex flex-col">
    <HeadersNonAuthedHeader />
    <main class="flex-grow">      
      <slot />
    </main>
    <StandardFooter />
  </div>
</template>

<script setup>

</script>