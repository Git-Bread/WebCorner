<template>
  <div class="field-controls">
    <!-- Resize controls (expand/shrink) -->
    <div class="expansion-controls">
      <!-- Down controls -->
      <button 
        v-if="canExpand(field, 'down')" 
        @click.stop="$emit('expand', field.id, 'down')" 
        class="expansion-arrow down-arrow"
        title="Expand down"
      >
        <fa :icon="['fas', 'chevron-down']" />
      </button>
      
      <button 
        v-if="canShrink(field, 'down')" 
        @click.stop="$emit('shrink', field.id, 'down')" 
        class="shrink-arrow down-shrink-arrow"
        title="Shrink from bottom"
      >
        <fa :icon="['fas', 'compress-alt']" />
      </button>
      
      <!-- Right controls -->
      <button 
        v-if="canExpand(field, 'right')" 
        @click.stop="$emit('expand', field.id, 'right')" 
        class="expansion-arrow right-arrow"
        title="Expand right"
      >
        <fa :icon="['fas', 'chevron-right']" />
      </button>
      
      <button 
        v-if="canShrink(field, 'right')" 
        @click.stop="$emit('shrink', field.id, 'right')" 
        class="shrink-arrow right-shrink-arrow"
        title="Shrink from right"
      >
        <fa :icon="['fas', 'compress-alt']" />
      </button>
      
      <!-- Up controls -->
      <button 
        v-if="canExpand(field, 'up')" 
        @click.stop="$emit('expand', field.id, 'up')" 
        class="expansion-arrow up-arrow"
        title="Expand up"
      >
        <fa :icon="['fas', 'chevron-up']" />
      </button>
      
      <button 
        v-if="canShrink(field, 'up')" 
        @click.stop="$emit('shrink', field.id, 'up')" 
        class="shrink-arrow up-shrink-arrow"
        title="Shrink from top"
      >
        <fa :icon="['fas', 'compress-alt']" />
      </button>
      
      <!-- Left controls -->
      <button 
        v-if="canExpand(field, 'left')" 
        @click.stop="$emit('expand', field.id, 'left')" 
        class="expansion-arrow left-arrow"
        title="Expand left"
      >
        <fa :icon="['fas', 'chevron-left']" />
      </button>
      
      <button 
        v-if="canShrink(field, 'left')" 
        @click.stop="$emit('shrink', field.id, 'left')" 
        class="shrink-arrow left-shrink-arrow"
        title="Shrink from left"
      >
        <fa :icon="['fas', 'compress-alt']" />
      </button>
    </div>
    
    <!-- Delete button -->
    <div class="delete-button">
      <button @click.stop="$emit('delete', field.id)" class="delete-button-circle bg-red-500 hover:bg-red-600 text-white shadow-sm">
        <fa :icon="['fas', 'trash']" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FieldConfig, Direction } from './types/fieldTypes';

defineProps<{
  field: FieldConfig;
  canExpand: (field: FieldConfig, direction: Direction) => boolean;
  canShrink: (field: FieldConfig, direction: Direction) => boolean;
}>();

defineEmits<{
  (e: 'expand', id: string, direction: Direction): void;
  (e: 'shrink', id: string, direction: Direction): void;
  (e: 'delete', id: string): void;
}>();
</script>

<style scoped>
@import './styles/fieldStyles.css';
</style>