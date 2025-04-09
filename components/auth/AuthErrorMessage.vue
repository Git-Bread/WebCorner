<template>
  <div v-if="generalError" class="text-error text-sm p-3 bg-error-light border border-error-light rounded flex form-error-shake" role="alert" aria-live="assertive">
    <fa :icon="['fas', 'circle-exclamation']" class="h-5 w-5 mr-2 text-error" aria-hidden="true"/>
    <span>{{ generalError }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps({
  generalError: {
    type: String,
    default: ''
  }
});
</script>