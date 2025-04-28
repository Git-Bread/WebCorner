<template>
  <div class="space-y-6">
    <h3 class="font-medium text-heading">Notifications</h3>
    
    <div class="space-y-4">
      <!-- Email Notifications -->
      <ToggleSwitch 
        label="Email Notifications"
        :model-value="settings.notifications.email"
        @update:model-value="(value) => $emit('update:notification', 'email', value)" />

      <!-- Desktop Notifications -->
      <ToggleSwitch 
        label="Desktop Notifications"
        :model-value="settings.notifications.desktop" 
        @update:model-value="(value) => $emit('update:notification', 'desktop', value)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import { type NotificationSettings } from '~/composables/useUserSettings';
import ToggleSwitch from '~/components/userComponents/ui/ToggleSwitch.vue';

interface NotificationsTabProps {
  settings: {
    notifications: NotificationSettings;
  };
}

const props = defineProps<NotificationsTabProps>();

defineEmits<{
  'update:notification': [key: keyof NotificationSettings, value: boolean];
}>();
</script>