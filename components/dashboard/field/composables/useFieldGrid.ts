import { ref, computed, watch } from 'vue';
import { 
  type FieldConfig, 
  type FieldPosition, 
  type ComponentSelection,
  GRID_CONSTANTS
} from '../types/fieldTypes';

// Properly typing the emit parameter
type FieldGridEmit = {
  (event: 'update:config', config: FieldConfig[]): void;
  (event: 'save-config', config: FieldConfig[]): void;
};

export function useFieldGrid(props: {
  initialConfig?: FieldConfig[];
  serverId?: string;
}, emit: FieldGridEmit) {
  const { TOTAL_GRID_ROWS, GRID_COLS } = GRID_CONSTANTS;
  
  // Field configuration state - use initialConfig directly as all components now use the new format
  const fieldConfiguration = ref<FieldConfig[]>(props.initialConfig || []);
  
  // Flag to show available spots in edit mode
  const showAvailableSpots = ref(true);
  
  // Edit mode state
  const isEditMode = ref(false);
  
  // Save indicator states
  const showSaveIndicator = ref(false);
  let isSaveIndicatorFading = ref(false);
  const isSaving = ref(false);

  // Compute the actual number of visible rows needed based on components
  const gridRows = computed(() => {
    if (fieldConfiguration.value.length === 0) return TOTAL_GRID_ROWS;
    
    // Find the maximum row that any component occupies
    let maxRow = 0;
    fieldConfiguration.value.forEach(field => {
      const rowEnd = field.position.row + field.size.height;
      if (rowEnd > maxRow) {
        maxRow = rowEnd;
      }
    });
    
    // Return at least 4 rows or more if needed, but no more than TOTAL_GRID_ROWS
    return Math.min(Math.max(4, maxRow), TOTAL_GRID_ROWS);
  });

  // Cell size for rows - all rows should be the same fixed height
  const rowHeight = computed(() => {
    // Set a consistent row height in pixels 
    return '300px';
  });

  // Dynamic grid-template style computation
  const gridTemplateStyle = computed(() => {
    return {
      gridTemplateRows: `repeat(${gridRows.value}, ${rowHeight.value})`,
      gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
      gap: '1rem',
      display: 'grid',
      width: '100%',
      minHeight: `${gridRows.value * parseInt(rowHeight.value)}px`,
    };
  });

  // Toggle edit mode
  const toggleEditMode = () => {
    isEditMode.value = !isEditMode.value;
  };

  // Create a 2D grid representation of occupied cells
  const createGridOccupancyMap = () => {
    // Create a grid that's large enough for all components plus some extra space
    const maxPossibleRows = Math.max(gridRows.value + 5, 20); // Allow plenty of room for expansion
    const grid: (string | null)[][] = Array(maxPossibleRows).fill(0).map(() => Array(GRID_COLS).fill(null));
    
    // Mark occupied spaces
    fieldConfiguration.value.forEach(field => {
      const { row, col } = field.position;
      const { width, height } = field.size;
      
      for (let r = row; r < row + height && r < maxPossibleRows; r++) {
        for (let c = col; c < col + width && c < GRID_COLS; c++) {
          if (r >= 0 && c >= 0 && r < maxPossibleRows && c < GRID_COLS) {
            grid[r][c] = field.id;
          }
        }
      }
    });
    
    return grid;
  };

  // Check if a 2x2 component can fit at the given position
  const canFit2x2AtPosition = (position: FieldPosition): boolean => {
    const grid = createGridOccupancyMap();
    const { row, col } = position;
    
    // Check if 2x2 grid is available at this position
    for (let r = row; r < row + 2; r++) {
      for (let c = col; c < col + 2; c++) {
        // If out of bounds or cell is occupied, can't fit
        if (r >= grid.length || c >= GRID_COLS || grid[r]?.[c] !== null) {
          return false;
        }
      }
    }
    return true;
  };

  // Calculate available grid spots for new components (now filtering for 2x2 spots)
  const availableSpots = computed(() => {
    const grid = createGridOccupancyMap();
    
    // Find available spots for 2x2 components
    const spots: FieldPosition[] = [];
    
    // Only check within the first TOTAL_GRID_ROWS rows
    for (let r = 0; r < TOTAL_GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const position = { row: r, col: c };
        // Ensure we don't allow components that would extend beyond row limit
        if (r + 2 <= TOTAL_GRID_ROWS && canFit2x2AtPosition(position)) {
          spots.push(position);
        }
      }
    };
    
    return spots;
  });

  // Calculate spots that are 1x1 (too small for 2x2)
  const availableSmallSpots = computed(() => {
    const grid = createGridOccupancyMap();
    
    // Find available spots for 1x1 components that can't fit 2x2
    const smallSpots: FieldPosition[] = [];
    
    // Check each cell in the grid
    for (let r = 0; r < TOTAL_GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const position = { row: r, col: c };
        // If spot is empty but can't fit a 2x2 component
        if (isPositionEmpty(position) && !canFit2x2AtPosition(position)) {
          smallSpots.push(position);
        }
      }
    };
    
    return smallSpots;
  });

  // Check if a single position is empty (for 1x1 components)
  const isPositionEmpty = (position: FieldPosition): boolean => {
    const grid = createGridOccupancyMap();
    const { row, col } = position;
    
    // Check if the cell is within bounds and empty
    if (row >= 0 && col >= 0 && row < grid.length && col < GRID_COLS) {
      return grid[row][col] === null;
    }
    
    return false;
  };

  // Style for available spots
  const getAvailableSpotStyle = (spot: FieldPosition) => {
    return {
      gridRow: `${spot.row + 1} / span 2`,
      gridColumn: `${spot.col + 1} / span 2`,
      height: '100%', // Ensure it fills the full height of the grid cells
      minHeight: '300px', // Match the row height
    };
  };

  // Style for small (1x1) available spots
  const getSmallSpotStyle = (spot: FieldPosition) => {
    return {
      gridRow: `${spot.row + 1} / span 1`,
      gridColumn: `${spot.col + 1} / span 1`,
      height: '100%', // Ensure it fills the full height of the grid cell
      minHeight: rowHeight.value, // Use the same row height as regular spots instead of hardcoded value
    };
  };

  // Style for the "Add Component" button
  const getAddButtonStyle = () => {
    // If there are available spots, place it at the first available spot
    if (availableSpots.value.length > 0) {
      const spot = availableSpots.value[0];
      return {
        gridRow: `${spot.row + 1} / span 2`,
        gridColumn: `${spot.col + 1} / span 2`,
      };
    }
    
    // If no spots available but grid is empty, start at (0,0)
    if (fieldConfiguration.value.length === 0) {
      return {
        gridRow: '1 / span 2',
        gridColumn: '1 / span 2',
      };
    }
    
    // Otherwise, place it at the bottom of the grid
    return {
      gridRow: `${gridRows.value - 1} / span 2`,
      gridColumn: '1 / span 2',
      marginTop: '1rem',
    };
  };

  // Generate a unique ID for new fields
  const generateId = () => `field_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // Methods for field layout and manipulation
  const getFieldStyle = (field: FieldConfig) => {
    return {
      gridRow: `${field.position.row + 1} / span ${field.size.height}`,
      gridColumn: `${field.position.col + 1} / span ${field.size.width}`,
    };
  };

  // Add a component picker directly to the grid
  const addComponentPicker = () => {
    if (availableSpots.value.length > 0) {
      addComponentPickerAt(availableSpots.value[0]);
    } else if (fieldConfiguration.value.length === 0) {
      // If grid is empty, add component at 0,0
      addComponentPickerAt({ row: 0, col: 0 });
    }
  };

  // Add a component picker at a specific position
  const addComponentPickerAt = (position: FieldPosition) => {
    // Add a special "picker" component type
    fieldConfiguration.value.push({
      id: generateId(),
      title: 'Select Component',
      componentType: 'picker',
      size: { width: 2, height: 2 }, // Default to 2x2 now
      position: position,
      props: {}
    });
  };

  // Add a small (1x1) component picker at a specific position
  const addSmallComponentPickerAt = (position: FieldPosition) => {
    // Add a special "picker" component type for small components
    fieldConfiguration.value.push({
      id: generateId(),
      title: 'Select Component',
      componentType: 'picker',
      size: { width: 1, height: 1 }, // 1x1 size
      position: position,
      props: {}
    });
  };

  // Handle component selection from the ComponentPicker
  const handleComponentSelection = (selection: ComponentSelection, pickerId: string) => {
    // Find the picker component
    const pickerIndex = fieldConfiguration.value.findIndex(f => f.id === pickerId);
    
    if (pickerIndex >= 0) {
      // Get the current picker component
      const pickerComponent = fieldConfiguration.value[pickerIndex];
      
      // Create the new component directly without showing dialog
      const newComponent: FieldConfig = {
        id: pickerId, // Reuse the picker ID
        title: selection.title,
        componentType: selection.componentType,
        size: pickerComponent.size,
        position: pickerComponent.position,
        props: {}
      };
      
      // Replace the picker with the actual component
      fieldConfiguration.value.splice(pickerIndex, 1, newComponent);
      
      // Save the layout
      saveLayout();
    }
  };

  // Delete a component
  const deleteComponent = (id: string) => {
    fieldConfiguration.value = fieldConfiguration.value.filter(
      field => field.id !== id
    );
    
    // Save the updated layout
    saveLayout();
  };

  const removePicker = (pickerId: string) => {
    fieldConfiguration.value = fieldConfiguration.value.filter(
      field => field.id !== pickerId
    );
  };

  // Save the current layout configuration
  const saveLayout = () => {
    isSaving.value = true;
    showSaveIndicator.value = true;
    isSaveIndicatorFading = ref(false);
    
    // Emit layout update events
    emit('update:config', fieldConfiguration.value);
    emit('save-config', fieldConfiguration.value);
    
    // Simulate saving delay (in a real app, this would be an async API call)
    setTimeout(() => {
      isSaving.value = false;
      
      // Show the saved indicator for 2 seconds, then fade out
      setTimeout(() => {
        isSaveIndicatorFading.value = true;
        
        setTimeout(() => {
          showSaveIndicator.value = false;
          isSaveIndicatorFading.value = false;
        }, 300); // Fade out duration
      }, 2000);
    }, 800); // Simulate save operation
  };

  // Watch for changes in initial config (e.g. from server updates)
  watch(() => props.initialConfig, (newConfig) => {
    if (newConfig) {
      fieldConfiguration.value = newConfig;
    }
  }, { deep: true });

  return {
    fieldConfiguration,
    isEditMode,
    showAvailableSpots,
    showSaveIndicator,
    isSaveIndicatorFading,
    isSaving,
    gridRows,
    rowHeight,
    gridTemplateStyle,
    availableSpots,
    availableSmallSpots,
    toggleEditMode,
    getFieldStyle,
    getAvailableSpotStyle,
    addComponentPicker,
    addComponentPickerAt,
    addSmallComponentPickerAt,
    handleComponentSelection,
    deleteComponent,
    removePicker,
    saveLayout,
    generateId,
    getAddButtonStyle,
    isPositionEmpty,
    getSmallSpotStyle
  };
}