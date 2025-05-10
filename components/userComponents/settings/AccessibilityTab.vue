<template>
  <div class="space-y-6">
    <h3 class="font-medium text-heading">Accessibility</h3>
    <div class="space-y-4">
      <!-- Disable Animations -->
      <ToggleSwitch 
        label="Disable Animations"
        :model-value="settings.accessibility.disableAnimations"
        @update:model-value="(value) => $emit('update:accessibility', 'disableAnimations', value)" />

      <!-- High Contrast -->
      <ToggleSwitch 
        label="High Contrast"
        :model-value="settings.accessibility.highContrast" 
        @update:model-value="(value) => $emit('update:accessibility', 'highContrast', value)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { type AccessibilitySettings } from '~/composables/useUserSettings';
import ToggleSwitch from '~/components/userComponents/ui/ToggleSwitch.vue';

interface AccessibilityTabProps {
  settings: { 
    accessibility: AccessibilitySettings;
  };
}

const props = defineProps<AccessibilityTabProps>();

defineEmits<{
  'update:accessibility': [key: keyof AccessibilitySettings, value: boolean];
}>();
</script>