<template>
  <div>
    <label class="block font-medium text-heading mb-1">{{ label }}</label>
    <div class="grid grid-cols-3 gap-1">
      <button 
        v-for="preset in presetOptions"
        :key="preset.id"
        @click="selectPreset(preset.id)" 
        class="h-8 rounded border border-border hover:border-theme-primary transition-colors"
        :class="{'border-2 border-theme-primary': modelValue === preset.id}"
        :style="{ background: preset.style }"
        :title="preset.title">
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

// Define the interface for color presets
interface ColorPreset {
  id: string;
  style: string;
  title: string;
}

// Define props with types
const props = defineProps({
  label: {
    type: String,
    required: true
  },
  modelValue: {
    type: String,
    required: true
  },
  presetOptions: {
    type: Array as () => ColorPreset[],
    required: true,
    validator: (array: any[]) => 
      array.every(item => 
        typeof item === 'object' && 
        'id' in item && 
        'style' in item && 
        'title' in item
      )
  }
});

// Define emits
const emit = defineEmits(['update:modelValue']);

// Method to handle preset selection
const selectPreset = (presetId: string) => {
  emit('update:modelValue', presetId);
};
</script>