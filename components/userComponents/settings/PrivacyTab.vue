<template>
  <div class="space-y-6">
    <h3 class="font-medium text-heading">Privacy</h3>
    
    <div class="space-y-4">
      <!-- Online Status -->
      <ToggleSwitch 
        label="Show Online Status"
        :model-value="settings.privacy.onlineStatus"
        @update:model-value="(value) => $emit('update:privacy', 'onlineStatus', value)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { type PrivacySettings } from '~/composables/useUserSettings';
import ToggleSwitch from '~/components/userComponents/ui/ToggleSwitch.vue';

interface PrivacyTabProps {
  settings: { 
    privacy: PrivacySettings;
  };
}

const props = defineProps<PrivacyTabProps>();

defineEmits<{
  'update:privacy': [key: keyof PrivacySettings, value: boolean];
}>();
</script>