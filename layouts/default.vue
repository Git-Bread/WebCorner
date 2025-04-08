<template>
  <div class="default-layout min-h-screen flex flex-col">
    <Transition name="fade" mode="out-in">
      <HeadersStandardHeader v-if="isAuthenticated" />
      <HeadersNonAuthedHeader v-else />
    </Transition>
    <main class="flex-grow">      
      <slot />
    </main>
    <StandardFooter />
  </div>
</template>

<script setup>
const { isAuthenticated } = useAuth()
</script>