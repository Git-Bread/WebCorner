<template>
  <div class="space-y-6">
    <h3 class="font-medium text-heading">Appearance</h3>
    <div class="space-y-4">
      <!-- Theme Selection -->
      <ThemeSelector 
        :model-value="settings.appearance.theme"
        :disabled="isHighContrastEnabled"
        @update:theme="(theme) => $emit('update:theme', theme)" />
      
      <!-- Font Size -->
      <FontSizeSelector 
        :model-value="settings.appearance.fontSize"
        @update:font-size="(fontSize) => $emit('update:font-size', fontSize)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed } from 'vue';
import { type AppearanceSettings, type ThemeOption, type FontSizeOption } from '~/composables/useUserSettings';
import ThemeSelector from '~/components/userComponents/ui/ThemeSelector.vue';
import FontSizeSelector from '~/components/userComponents/ui/FontSizeSelector.vue';

interface AppearanceTabProps {
  settings: { 
    appearance: AppearanceSettings;
    accessibility?: { highContrast: boolean };
  };
}

const props = defineProps<AppearanceTabProps>();

defineEmits<{
  'update:theme': [theme: ThemeOption];
  'update:font-size': [fontSize: FontSizeOption];
}>();

const isHighContrastEnabled = computed(() => {
  return props.settings.accessibility?.highContrast || false;
});
</script>