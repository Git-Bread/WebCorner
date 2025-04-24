<template>
  <div>
    <label class="block font-medium text-text mb-1">Font Size</label>
    <div class="flex space-x-2">
      <button 
        v-for="size in fontSizes" 
        :key="size.value"
        @click="$emit('update:fontSize', size.value)"
        :class="[
          'p-3 border rounded-md w-24 h-24 flex flex-col items-center justify-center',
          modelValue === size.value 
            ? 'border-theme-primary ring-2 ring-theme-primary bg-surface text-heading font-medium'
            : 'border-border bg-background hover:border-link focus:outline-none focus:ring-2 focus:ring-link text-text hover:text-heading'
        ]">
        <span class="font-bold" :class="getFontSizeClass(size.value)">Wc</span>
        <span class="mt-1">{{ size.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import { useUserSettings, type FontSizeOption } from '~/composables/useUserSettings';

const { fontSizes } = useUserSettings();

defineProps<{
  modelValue: FontSizeOption;
}>();

defineEmits(['update:fontSize']);

// Function to get the appropriate CSS class for each font size option
const getFontSizeClass = (size: FontSizeOption) => {
  switch(size) {
    case 'small':
      return 'text-sm';
    case 'medium':
      return 'text-base';
    case 'large':
      return 'text-lg';
    case 'extra-large':
      return 'text-xl';
    default:
      return 'text-base';
  }
};
</script>