<template>
  <div class="flex items-center justify-between">
    <span class="font-medium text-text">{{ label }}</span>
    <button 
      type="button" 
      :class="getToggleTrackClasses(modelValue)" 
      @click="$emit('update:modelValue', !modelValue)">
      <span :class="getToggleThumbClasses(modelValue)"></span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { getToggleTrackClasses, getToggleThumbClasses } from '~/utils/settingsUtils';

defineProps<{
  label: string;
  modelValue: boolean;
}>();

defineEmits(['update:modelValue']);
</script>