<template>
  <div class="space-y-6">
    <h3 class="font-medium text-heading">Accessibility</h3>
    <div class="space-y-4">
      <!-- Disable Animations -->
      <ToggleSwitch 
        label="Disable Animations"
        :model-value="settings.accessibility.disableAnimations"
        @update:model-value="updateSetting('disableAnimations', $event)" />

      <!-- High Contrast -->
      <ToggleSwitch 
        label="High Contrast"
        :model-value="settings.accessibility.highContrast" 
        @update:model-value="updateSetting('highContrast', $event)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import { type AccessibilitySettings } from '~/composables/useUserSettings';

const props = defineProps<{
  settings: { accessibility: AccessibilitySettings };
}>();

const emit = defineEmits(['update:setting']);

const updateSetting = (key: keyof AccessibilitySettings, value: boolean) => {
  emit('update:setting', { key, value });
};
</script>