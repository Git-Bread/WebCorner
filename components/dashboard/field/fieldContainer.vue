<template>
  <div class="field-container p-2">
    <!-- Loading indicator -->
    <div v-if="isLoadingLayout" class="loading-overlay">
      <LoadingIndicator message="Loading your layout..." />
    </div>
    
    <!-- Scrollable grid layout container -->
    <div class="grid-container" :class="{ 'blur-sm': isLoadingLayout }">
      <div 
        class="grid-layout p-0" 
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
            :serverId="serverId"
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
        :disabled="isLoadingLayout"
        class="bg-background border border-border rounded-md px-4 py-2 flex items-center mr-3"
        :class="{ 'bg-theme-primary text-text border-theme-primary': isEditMode, 'opacity-50 cursor-not-allowed': isLoadingLayout }"
      >
        <fa :icon="['fas', 'edit']" class="mr-2 text-lg" :class="{ 'text-theme-primary': !isEditMode }" /> 
        <span class="text-text">{{ isEditMode ? 'Exit Edit Mode' : 'Edit Layout' }}</span>
      </button>
      
      <!-- Save layout button -->
      <button 
        v-if="hasUnsavedChanges"
        @click="saveLayoutChanges"
        :disabled="isSaving"
        class="bg-theme-primary text-background border border-theme-primary rounded-md px-4 py-2 flex items-center"
        :class="{ 'opacity-50 cursor-not-allowed': isSaving }"
      >
        <fa :icon="['fas', isSaving ? 'spinner' : 'save']" class="mr-2 text-lg" :spin="isSaving" /> 
        <span>Save Layout</span>
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
import { onMounted, watch, onUnmounted } from 'vue';
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

const emit = defineEmits(['update:config', 'save-config', 'before-navigate']);

// Extract props for template usage
const { serverId } = props;

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
  saveLayout,
  hasUnsavedChanges
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

// Initialize the component
onMounted(() => {
  // Initialize the configuration based on props
  if (props.initialConfig && props.initialConfig.length > 0) {
    fieldConfiguration.value = [...props.initialConfig];
  } else {
    // No default components - start with an empty grid
    fieldConfiguration.value = [];
  }
  
  // Set up beforeunload event listener to warn when leaving with unsaved changes
  window.addEventListener('beforeunload', handleBeforeUnload);
});

// Clean up the event listener when the component is unmounted
onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});

// Handle beforeunload event to save changes when leaving the page
const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (hasUnsavedChanges) {
    // Save the layout automatically instead of showing an alert
    saveLayoutChanges();
  }
};

// Save layout changes
const saveLayoutChanges = () => {
  saveLayout();
};

// Method that parent components can call to check if there are unsaved changes
// and save them before navigating away
const checkAndSaveBeforeNavigate = () => {
  if (hasUnsavedChanges) {
    // Save the changes
    saveLayout();
    
    // Emit event to inform parent that handling is complete
    emit('before-navigate', { saved: true });
    return true;
  }
  
  // No unsaved changes, navigation can proceed immediately
  emit('before-navigate', { saved: false });
  return false;
};

// Expose methods to parent component
defineExpose({
  checkAndSaveBeforeNavigate
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

/* Ensure proper blur during loading */
.blur-sm {
  filter: blur(2px);
  pointer-events: none;
}

/* Edit mode toggle and save buttons container */
.edit-mode-toggle {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 40;
  display: flex;
  flex-direction: row;
  align-items: center;
}
</style>