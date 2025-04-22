<template>
    <div class="relative" :class="fieldClass">
      <button type="submit" 
        class="w-full flex justify-center items-center py-2 px-4 border border-transparent font-medium rounded-md text-white bg-secondary hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary"
        :disabled="disabled || loading"
        :class="{ 'opacity-50 cursor-not-allowed': disabled || loading, 'submit-button-pulse': !disabled && !loading }"
        :aria-busy="loading"
        aria-live="polite">
        <fa v-if="loading" :icon="['fas', 'spinner']" class="animate-spin h-5 w-5 mr-2" aria-hidden="true"/>
        <fa v-else :icon="['fas', iconName]" class="mr-2" aria-hidden="true"/>
        {{ label }}
      </button>
      <div class="text-center mt-4 relative z-20">
        <NuxtLink :to="linkTo" class="font-medium text-link hover:text-link-hover flex items-center justify-center">
          <span>{{ linkText }}</span>
          <fa :icon="['fas', 'arrow-right']" class="ml-1" aria-hidden="true"/>
        </NuxtLink>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  defineProps({
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    label: { type: String, required: true },
    iconName: { type: String, required: true },
    linkTo: { type: String, required: true },
    linkText: { type: String, required: true },
    fieldClass: { type: String, default: '' }
  });
  </script>