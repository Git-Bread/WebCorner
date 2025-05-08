<template>
  <div 
    class="field-item bg-background border border-border rounded-lg"
    :style="style"
    :class="{ 'edit-mode-active': isEditMode }"
  >
    <!-- Show ComponentPicker for fields that are in picking state -->
    <ComponentPicker
      v-if="field.componentType === 'picker'"
      :position="field.position"
      :availableComponentTypes="availableComponentTypes"
      @select-component="$emit('select-component', $event, field.id)"
      @cancel="$emit('remove-picker', field.id)"
      class="field-content"
    />
    <!-- Dynamic component rendering based on field type -->
    <component 
      v-else-if="field.componentType && resolveComponent(field.componentType)" 
      :is="resolveComponent(field.componentType)" 
      v-bind="field.props || {}"
      class="field-content h-full w-full"
    />
    <div v-else class="field-placeholder text-text-muted flex items-center justify-center h-full">
      <span>{{ field.placeholder || 'Add content here' }}</span>
    </div>
    
    <!-- Controls for editing (only in edit mode) -->
    <FieldControls
      v-if="isEditMode"
      :field="field"
      :canExpand="canExpand"
      :canShrink="canShrink"
      @expand="(id, dir) => $emit('expand', id, dir)"
      @shrink="(id, dir) => $emit('shrink', id, dir)"
      @delete="(id) => $emit('delete', id)"
    />
  </div>
</template>

<script setup lang="ts">
import { markRaw } from 'vue';
import { resolveComponent as localResolveComponent, getAvailableComponentTypes } from './FieldComponentRegistry';
import ComponentPicker from './ComponentPicker.vue';
import FieldControls from './FieldControls.vue';
import type { FieldConfig, Direction, ComponentSelection } from './types/fieldTypes';

// Define props
const props = defineProps<{
  field: FieldConfig;
  style: Record<string, string>;
  isEditMode: boolean;
  canExpand: (field: FieldConfig, direction: Direction) => boolean;
  canShrink: (field: FieldConfig, direction: Direction) => boolean;
}>();

// Define emits
const emit = defineEmits<{
  (e: 'select-component', selection: ComponentSelection, id: string): void;
  (e: 'remove-picker', id: string): void;
  (e: 'expand', id: string, direction: Direction): void;
  (e: 'shrink', id: string, direction: Direction): void;
  (e: 'delete', id: string): void;
}>();

// Get available component types from registry
const availableComponentTypes = getAvailableComponentTypes();

// Custom component resolver that returns proper Vue component definition
const resolveComponent = (type: string) => {
  const component = localResolveComponent(type);
  return component ? markRaw(component) : null;
};
</script>

<style scoped>
@import './styles/fieldStyles.css';
</style>