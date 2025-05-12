<template>
  <div class="field-container h-full bg-background text-text">
    <!-- Fields Grid (Only show once loaded) -->
    <div v-if="!isLoadingLayout" class="grid-dropzone grid-rows-12 grid-cols-12 w-full h-full relative gap-2 p-2">
      <!-- Empty State Message -->
      <div v-if="internalConfig.length === 0" class="col-span-12 row-span-12 flex flex-col items-center justify-center">
        <div class="text-center max-w-md mx-auto">
          <h3 class="text-xl font-medium text-heading mb-4">Your dashboard is empty</h3>
          <p class="text-text-muted mb-6">Add components to customize your server dashboard.</p>
          <button 
            @click="addNewField()" 
            class="px-4 py-2 bg-theme-primary text-background rounded-md hover:bg-opacity-90 flex items-center justify-center mx-auto"
          >
            <fa :icon="['fas', 'plus']" class="mr-2" />
            Add Component
          </button>
        </div>
      </div>
      
      <!-- Render Each Field Component -->
      <component 
        v-for="field in internalConfig" 
        :key="field.id"
        :is="getComponentType(field.componentType)"
        v-bind="getComponentData(field)"
        :class="getPositionClasses(field.position, field.size)"
        :serverId="serverId"
      />
      
      <!-- Component Picker (Only show when picking a component) -->
      <ComponentPicker 
        v-if="showComponentPicker"
        :position="pickerPosition"
        :available-component-types="availableComponentTypes"
        :serverId="serverId"
        @select-component="handleComponentSelection"
        @cancel="showComponentPicker = false"
        class="absolute top-0 left-0 w-full h-full bg-background z-50 p-4"
      />
    </div>
    
    <!-- Loading Indicator -->
    <div v-else class="w-full h-full flex items-center justify-center">
      <div class="text-center">
        <div class="w-10 h-10 border-2 border-t-theme-primary rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-text-muted">Loading dashboard...</p>
      </div>
    </div>
    
    <!-- Add Component Button (Only show if fields exist and picker not shown) -->
    <div 
      v-if="internalConfig.length > 0 && !showComponentPicker && !isLoadingLayout" 
      class="absolute bottom-6 right-6"
    >
      <button 
        @click="addNewField()" 
        class="w-12 h-12 rounded-full bg-theme-primary text-background flex items-center justify-center shadow-lg hover:bg-opacity-90"
        aria-label="Add component"
      >
        <fa :icon="['fas', 'plus']" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useFieldGrid } from './composables/useFieldGrid';
import { useFieldResize } from './composables/useFieldResize';
import FieldItem from './FieldItem.vue';
import LoadingIndicator from '../LoadingIndicator.vue';
import type { Direction, FieldConfig } from './types/fieldTypes';

// Define props and emits
const props = defineProps<{
  initialConfig?: FieldConfig[];
  serverId?: string;
  isLoadingLayout?: boolean;
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

// Watch for changes in initial config from parent component
watch(() => props.initialConfig, (newConfig) => {
  if (newConfig && newConfig.length > 0) {
    fieldConfiguration.value = [...newConfig];
  } else {
    fieldConfiguration.value = [];
  }
}, { immediate: true });

// Add server-specific loading/saving of field configuration
onMounted(() => {
  // Initialize the configuration based on props
  if (props.initialConfig && props.initialConfig.length > 0) {
    fieldConfiguration.value = [...props.initialConfig];
  } else {
    // No default components - start with an empty grid
    fieldConfiguration.value = [];
  }
});
</script>

<style scoped>
@import './styles/fieldStyles.css';

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(var(--color-background-rgb), 0.7);
  z-index: 10;
}
</style>