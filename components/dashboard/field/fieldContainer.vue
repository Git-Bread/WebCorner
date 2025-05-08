<template>
  <div class="field-container pl-2 pr-2">
    <!-- Scrollable grid layout container -->
    <div class="grid-container">
      <div 
        class="grid-layout" 
        :style="gridTemplateStyle"
      >
        <!-- Show available spots when in edit mode -->
        <template v-if="isEditMode && showAvailableSpots">
          <!-- 2x2 available spots -->
          <div 
            v-for="(spot, index) in availableSpots" 
            :key="`spot-${index}`"
            class="available-spot"
            :style="getAvailableSpotStyle(spot)"
            @click="addComponentPickerAt(spot)"
          >
            <fa :icon="['fas', 'plus']" class="text-lg" />
          </div>

          <!-- 1x1 small available spots -->
          <div 
            v-for="(spot, index) in availableSmallSpots" 
            :key="`small-spot-${index}`"
            class="available-spot available-spot-small"
            :style="getSmallSpotStyle(spot)"
            @click="addSmallComponentPickerAt(spot)"
          >
            <fa :icon="['fas', 'plus']" class="text-xs" />
          </div>
        </template>

        <!-- Render each component based on its position and size -->
        <template v-for="(field, index) in fieldConfiguration" :key="field.id">
          <FieldItem
            :field="field"
            :style="getFieldStyle(field)"
            :isEditMode="isEditMode"
            :canExpand="(field, direction) => canComponentExpand(field, direction)"
            :canShrink="(field, direction) => canComponentShrink(field, direction)"
            :serverId="props.serverId"
            @select-component="handleComponentSelection"
            @remove-picker="removePicker"
            @expand="expandComponentHandler"
            @shrink="shrinkComponentHandler"
            @delete="deleteComponent"
          />
        </template>
        
        <!-- Add new field button (shows at appropriate position) -->
        <div 
          v-if="!isEditMode"
          class="add-field-button border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-theme-primary"
          :style="getAddButtonStyle()"
          @click="addComponentPicker"
        >
          <span class="text-text-muted">
            <fa :icon="['fas', 'plus']" class="mr-2" />
            Add Component
          </span>
        </div>
      </div>
    </div>
    
    <!-- Edit mode toggle button in bottom left -->
    <div class="edit-mode-toggle">
      <button 
        @click="toggleEditMode"
        class="bg-background border border-border rounded-md px-4 py-2 flex items-center"
        :class="{ 'bg-theme-primary text-text border-theme-primary': isEditMode }"
      >
        <fa :icon="['fas', 'edit']" class="mr-2 text-lg" :class="{ 'text-theme-primary': !isEditMode }" /> 
        <span class="text-text">{{ isEditMode ? 'Exit Edit Mode' : 'Edit Layout' }}</span>
      </button>
    </div>
    
    <!-- Save indicator -->
    <div 
      v-if="showSaveIndicator" 
      class="save-indicator"
      :class="{ 'fade-out': isSaveIndicatorFading }"
    >
      <fa :icon="['fas', isSaving ? 'spinner' : 'check']" class="mr-2 text-lg text-theme-primary" :spin="isSaving" />
      <span>{{ isSaving ? 'Saving layout...' : 'Layout saved!' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useFieldGrid } from './composables/useFieldGrid';
import { useFieldResize } from './composables/useFieldResize';
import FieldItem from './FieldItem.vue';
import type { Direction, FieldConfig } from './types/fieldTypes';

// Define props and emits
const props = defineProps<{
  initialConfig?: FieldConfig[];
  serverId?: string;
}>();

const emit = defineEmits(['update:config', 'save-config']);

// Use our grid composable
const { 
  fieldConfiguration,
  isEditMode,
  showAvailableSpots,
  showSaveIndicator,
  isSaveIndicatorFading,
  isSaving,
  gridTemplateStyle,
  availableSpots,
  availableSmallSpots,
  toggleEditMode,
  getFieldStyle,
  getAvailableSpotStyle,
  getSmallSpotStyle,
  getAddButtonStyle,
  addComponentPicker,
  addComponentPickerAt,
  addSmallComponentPickerAt,
  handleComponentSelection,
  deleteComponent,
  removePicker,
  saveLayout
} = useFieldGrid(props, emit);

// Use our resize composable
const { canExpand, canShrink, expandComponent, shrinkComponent } = useFieldResize();

// Create a grid occupancy map for expansion checks
const createGridOccupancyMap = () => {
  // Create a grid that's large enough for all components plus some extra space
  const maxPossibleRows = 20; // Allow plenty of room for expansion
  const gridCols = 4;
  const grid = Array(maxPossibleRows).fill(0).map(() => Array(gridCols).fill(null));
  
  // Mark occupied spaces
  fieldConfiguration.value.forEach(field => {
    const { row, col } = field.position;
    const { width, height } = field.size;
    
    for (let r = row; r < row + height && r < maxPossibleRows; r++) {
      for (let c = col; c < col + width && c < gridCols; c++) {
        if (r >= 0 && c >= 0 && r < maxPossibleRows && c < gridCols) {
          grid[r][c] = field.id;
        }
      }
    }
  });
  
  return grid;
};

// Wrapper functions for expansion and shrinking
const canComponentExpand = (field: FieldConfig, direction: Direction): boolean => {
  const grid = createGridOccupancyMap();
  return canExpand(field, direction, grid);
};

const canComponentShrink = (field: FieldConfig, direction: Direction): boolean => {
  return canShrink(field, direction);
};

// Handle expand component event
const expandComponentHandler = (id: string, direction: Direction) => {
  const fieldIndex = fieldConfiguration.value.findIndex(f => f.id === id);
  if (fieldIndex < 0) return;
  
  const field = fieldConfiguration.value[fieldIndex];
  const newField = expandComponent(field, direction);
  
  fieldConfiguration.value[fieldIndex] = newField;
  saveLayout();
};

// Handle shrink component event
const shrinkComponentHandler = (id: string, direction: Direction) => {
  const fieldIndex = fieldConfiguration.value.findIndex(f => f.id === id);
  if (fieldIndex < 0) return;
  
  const field = fieldConfiguration.value[fieldIndex];
  const newField = shrinkComponent(field, direction);
  
  fieldConfiguration.value[fieldIndex] = newField;
  saveLayout();
};

// Add server-specific loading/saving of field configuration
onMounted(() => {
  // Here you would typically load the configuration from a database
  // based on the serverId prop
  if (props.serverId) {
    // This is where you'd load the layout from your database
    // For now, we'll use the initial config or default settings
    if (!props.initialConfig || props.initialConfig.length === 0) {
      // No default components - start with an empty grid
      fieldConfiguration.value = [];
    }
  }
});
</script>

<style scoped>
@import './styles/fieldStyles.css';
</style>