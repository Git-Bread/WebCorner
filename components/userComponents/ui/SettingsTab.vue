<!--Simple tab to lower the size of the settings menu-->
<template>
  <div class="space-y-5 pl-2">
    <h3 class="font-medium text-heading">{{ title }}</h3>
    <div class="space-y-4">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>