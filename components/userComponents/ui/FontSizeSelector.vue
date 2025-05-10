<template>
  <div>
    <label class="block font-medium text-text mb-1" id="font-size-label">Font Size</label>
    <div class="flex space-x-2" role="group" aria-labelledby="font-size-label">
      <button 
        v-for="size in fontSizes" 
        :key="size.value"
        @click="$emit('update:font-size', size.value)"
        :aria-pressed="modelValue === size.value"
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
import { type FontSizeOption } from '~/composables/useUserSettings';

const props = defineProps<{
  modelValue: FontSizeOption;
}>();

defineEmits<{
  'update:font-size': [fontSize: FontSizeOption];
}>();

/**
 * Define available font sizes and their display names
 */
const fontSizes = [
  { name: 'Small', value: 'small' },
  { name: 'Medium', value: 'medium' },
  { name: 'Large', value: 'large' },
  { name: 'XL', value: 'extra-large' }
];

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