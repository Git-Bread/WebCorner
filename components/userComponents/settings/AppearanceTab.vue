<template>
  <div class="space-y-4">
    <!-- Theme Selection -->
    <ThemeSelector 
      :model-value="settings.appearance.theme"
      :disabled="isHighContrastEnabled"
      @update:theme="updateTheme" />
    
    <!-- Font Size -->
    <FontSizeSelector 
      :model-value="settings.appearance.fontSize"
      @update:font-size="updateFontSize" />
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed } from 'vue';
import { type AppearanceSettings, type ThemeOption, type FontSizeOption } from '~/composables/useUserSettings';
import ThemeSelector from '~/components/userComponents/ui/ThemeSelector.vue';
import FontSizeSelector from '~/components/userComponents/ui/FontSizeSelector.vue';

const props = defineProps<{
  settings: { 
    appearance: AppearanceSettings,
    accessibility?: { highContrast: boolean }
  };
}>();

const emit = defineEmits(['update:theme', 'update:fontSize']);

const isHighContrastEnabled = computed(() => {
  return props.settings.accessibility?.highContrast || false;
});

const updateTheme = (theme: ThemeOption) => {
  emit('update:theme', theme);
};

const updateFontSize = (fontSize: FontSizeOption) => {
  emit('update:fontSize', fontSize);
};
</script>