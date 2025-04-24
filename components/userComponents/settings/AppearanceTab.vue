<template>
  <div class="space-y-6">
    <h3 class="font-medium text-heading">Appearance</h3>
    <div class="space-y-4">
      <!-- Theme Selection -->
      <ThemeSelector 
        :model-value="settings.appearance.theme"
        @update:theme="updateTheme" />
      
      <!-- Font Size -->
      <FontSizeSelector 
        :model-value="settings.appearance.fontSize"
        @update:fontSize="updateFontSize" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import { 
  type AppearanceSettings, 
  type ThemeOption,
  type FontSizeOption
} from '~/composables/useUserSettings';

const props = defineProps<{
  settings: { appearance: AppearanceSettings };
}>();

const emit = defineEmits<{
  'update:theme': [theme: ThemeOption];
  'update:fontSize': [size: FontSizeOption];
}>();

const updateTheme = (theme: ThemeOption) => {
  emit('update:theme', theme);
};

const updateFontSize = (fontSize: FontSizeOption) => {
  emit('update:fontSize', fontSize);
};
</script>