<template>
  <div>
    <label class="block font-medium text-text mb-1">Theme</label>
    <div class="flex space-x-4">
      <button 
        v-for="theme in themeOptions" 
        :key="theme"
        @click="$emit('update:theme', theme)"
        :class="['p-3 border rounded-md hover:border-link focus:outline-none focus:ring-2 focus:ring-link',
          modelValue === theme ? 'border-theme-primary ring-2 ring-theme-primary bg-surface' : 'bg-background border-border']">
        <span class="block w-full text-center">{{ getThemeName(theme) }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import { useUserSettings, type ThemeOption } from '~/composables/useUserSettings';

const { themeOptions } = useUserSettings();

defineProps<{
  modelValue: ThemeOption;
}>();

defineEmits(['update:theme']);

function getThemeName(theme: ThemeOption): string {
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}
</script>