<template>
  <div class="space-y-6">
    <h3 class="font-medium text-heading">Notifications</h3>
    
    <div class="space-y-4">
      <!-- Email Notifications -->
      <ToggleSwitch 
        label="Email Notifications"
        :model-value="settings.notifications.email"
        @update:model-value="updateSetting('email', $event)" />

      <!-- Desktop Notifications -->
      <ToggleSwitch 
        label="Desktop Notifications"
        :model-value="settings.notifications.desktop" 
        @update:model-value="updateSetting('desktop', $event)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import { type NotificationSettings } from '~/composables/useUserSettings';

const props = defineProps<{
  settings: { notifications: NotificationSettings };
}>();

const emit = defineEmits(['update:setting']);

const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
  emit('update:setting', { key, value });
};
</script>