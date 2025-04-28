<template>
  <div>
    <div class="flex items-center justify-between">
      <label class="block font-medium text-text mb-1">Theme</label>
      <span v-if="disabled" class="text-sm text-theme-primary font-medium">High contrast enabled</span>
    </div>
    <div class="flex space-x-4">
      <button 
        v-for="theme in themeOptions" 
        :key="theme"
        @click="$emit('update:theme', theme)"
        :disabled="disabled"
        :class="['p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-link',
          modelValue === theme 
            ? 'border-theme-primary ring-2 ring-theme-primary bg-surface text-heading font-medium' 
            : 'bg-background border-border text-text hover:text-heading',
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-link']">
        <span class="block w-full text-center">{{ getThemeName(theme) }}</span>
      </button>
    </div>
    <p v-if="disabled" class="text-text-muted text-sm mt-2">
      Theme selection is disabled while high contrast mode is active
    </p>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import { useUserSettings, type ThemeOption } from '~/composables/useUserSettings';

const { themeOptions } = useUserSettings();

const props = defineProps<{
  modelValue: ThemeOption;
  disabled?: boolean;
}>();

defineEmits(['update:theme']);

function getThemeName(theme: ThemeOption): string {
  if (theme === 'v-theme') return "V's Theme";
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}
</script>