<template>
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-heading">{{ displayName }}</h1>
    <p class="text-text-muted mt-2">Manage your account information and preferences</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  displayName: string;
}>();
</script>