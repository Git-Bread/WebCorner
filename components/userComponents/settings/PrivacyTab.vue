<template>
  <div class="space-y-6">
    <h3 class="font-medium text-heading">Privacy</h3>
    
    <div class="space-y-4">
      <!-- Online Status -->
      <ToggleSwitch 
        label="Show Online Status"
        :model-value="settings.privacy.onlineStatus"
        @update:model-value="updateSetting('onlineStatus', $event)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import { type PrivacySettings } from '~/composables/useUserSettings';

const props = defineProps<{
  settings: { privacy: PrivacySettings };
}>();

const emit = defineEmits(['update:setting']);

const updateSetting = (key: keyof PrivacySettings, value: boolean) => {
  emit('update:setting', { key, value });
};
</script>