<template>
  <div class="field-controls">
    <!-- Resize controls (expand/shrink) -->
    <div class="expansion-controls">
      <!-- Down controls -->
      <button 
        v-if="canExpand(field, 'down')" 
        @click.stop="$emit('expand', field.id, 'down')" 
        class="absolute w-6 h-6 bg-theme-primary text-text rounded-full flex items-center justify-center cursor-pointer shadow-md opacity-90 transition-all hover:scale-110 hover:opacity-100 bottom-2 left-1/2 -translate-x-1/2"
        title="Expand down"
      >
        <fa :icon="['fas', 'chevron-down']" />
      </button>
      
      <button 
        v-if="canShrink(field, 'down')" 
        @click.stop="$emit('shrink', field.id, 'down')" 
        class="absolute w-6 h-6 bg-theme-primary text-text rounded-full flex items-center justify-center cursor-pointer shadow-md opacity-90 transition-all hover:scale-110 hover:opacity-100 bottom-9 left-1/2 -translate-x-1/2"
        title="Shrink from bottom"
      >
        <fa :icon="['fas', 'compress-alt']" />
      </button>
      
      <!-- Right controls -->
      <button 
        v-if="canExpand(field, 'right')" 
        @click.stop="$emit('expand', field.id, 'right')" 
        class="absolute w-6 h-6 bg-theme-primary text-text rounded-full flex items-center justify-center cursor-pointer shadow-md opacity-90 transition-all hover:scale-110 hover:opacity-100 right-2 top-1/2 -translate-y-1/2"
        title="Expand right"
      >
        <fa :icon="['fas', 'chevron-right']" />
      </button>
      
      <button 
        v-if="canShrink(field, 'right')" 
        @click.stop="$emit('shrink', field.id, 'right')" 
        class="absolute w-6 h-6 bg-theme-primary text-text rounded-full flex items-center justify-center cursor-pointer shadow-md opacity-90 transition-all hover:scale-110 hover:opacity-100 right-9 top-1/2 -translate-y-1/2"
        title="Shrink from right"
      >
        <fa :icon="['fas', 'compress-alt']" />
      </button>
      
      <!-- Up controls -->
      <button 
        v-if="canExpand(field, 'up')" 
        @click.stop="$emit('expand', field.id, 'up')" 
        class="absolute w-6 h-6 bg-theme-primary text-text rounded-full flex items-center justify-center cursor-pointer shadow-md opacity-90 transition-all hover:scale-110 hover:opacity-100 top-2 left-1/2 -translate-x-1/2"
        title="Expand up"
      >
        <fa :icon="['fas', 'chevron-up']" />
      </button>
      
      <button 
        v-if="canShrink(field, 'up')" 
        @click.stop="$emit('shrink', field.id, 'up')" 
        class="absolute w-6 h-6 bg-theme-primary text-text rounded-full flex items-center justify-center cursor-pointer shadow-md opacity-90 transition-all hover:scale-110 hover:opacity-100 top-9 left-1/2 -translate-x-1/2"
        title="Shrink from top"
      >
        <fa :icon="['fas', 'compress-alt']" />
      </button>
      
      <!-- Left controls -->
      <button 
        v-if="canExpand(field, 'left')" 
        @click.stop="$emit('expand', field.id, 'left')" 
        class="absolute w-6 h-6 bg-theme-primary text-text rounded-full flex items-center justify-center cursor-pointer shadow-md opacity-90 transition-all hover:scale-110 hover:opacity-100 left-2 top-1/2 -translate-y-1/2"
        title="Expand left"
      >
        <fa :icon="['fas', 'chevron-left']" />
      </button>
      
      <button 
        v-if="canShrink(field, 'left')" 
        @click.stop="$emit('shrink', field.id, 'left')" 
        class="absolute w-6 h-6 bg-theme-primary text-text rounded-full flex items-center justify-center cursor-pointer shadow-md opacity-90 transition-all hover:scale-110 hover:opacity-100 left-9 top-1/2 -translate-y-1/2"
        title="Shrink from left"
      >
        <fa :icon="['fas', 'compress-alt']" />
      </button>
    </div>
    
    <!-- Delete button -->
    <div class="absolute top-2 right-2 transition-opacity">
      <button @click.stop="$emit('delete', field.id)" class="w-9 h-9 rounded-full flex items-center justify-center bg-error text-text shadow-sm transition-all hover:scale-110">
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