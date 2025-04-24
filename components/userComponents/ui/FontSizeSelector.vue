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
            ? 'border-theme-primary ring-2 ring-theme-primary bg-surface'
            : 'border-border bg-background hover:border-link focus:outline-none focus:ring-2 focus:ring-link'
        ]">
        <span class="font-bold">Wc</span>
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
</script>