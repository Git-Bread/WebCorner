import type { FieldConfig, Direction } from '../types/fieldTypes';

export function useFieldResize() {
  // Check if a component can expand in the given direction
  const canExpand = (field: FieldConfig, direction: Direction, grid: any[][]): boolean => {
    const { row, col } = field.position;
    const { width, height } = field.size;
    const totalGridRows = 16; // Maximum number of rows
    const gridCols = 4; // Fixed at 4 columns
    
    switch (direction) {
      case 'down':
        // Check if expanding down would exceed the total row limit
        if (row + height >= totalGridRows) return false;
        
        // Check if the cells below are free
        for (let c = col; c < col + width; c++) {
          if (c >= gridCols || grid[row + height]?.[c] !== null) {
            return false;
          }
        }
        return true;
        
      case 'right':
        // Check if the column to the right is within bounds and free
        if (col + width >= gridCols) return false;
        for (let r = row; r < row + height; r++) {
          if (r >= totalGridRows || grid[r]?.[col + width] !== null) {
            return false;
          }
        }
        return true;
        
      case 'up':
        // Check if the row above is within bounds and free
        if (row <= 0) return false;
        for (let c = col; c < col + width; c++) {
          if (c >= gridCols || grid[row - 1]?.[c] !== null) {
            return false;
          }
        }
        return true;
        
      case 'left':
        // Check if the column to the left is within bounds and free
        if (col <= 0) return false;
        for (let r = row; r < row + height; r++) {
          if (r >= totalGridRows || grid[r]?.[col - 1] !== null) {
            return false;
          }
        }
        return true;
    }
    
    return false;
  };

  // Check if a component can shrink in the given direction
  const canShrink = (field: FieldConfig, direction: Direction): boolean => {
    const { width, height } = field.size;
    
    switch (direction) {
      case 'down':
        return height > 1;
      case 'right':
        return width > 1;
      case 'up':
        return height > 1;
      case 'left':
        return width > 1;
    }
    
    return false;
  };

  // Expand a component in the specified direction
  const expandComponent = (field: FieldConfig, direction: Direction): FieldConfig => {
    const newField = { ...field };
    
    switch (direction) {
      case 'down':
        newField.size = { 
          width: field.size.width, 
          height: field.size.height + 1 
        };
        break;
        
      case 'right':
        newField.size = { 
          width: field.size.width + 1, 
          height: field.size.height 
        };
        break;
        
      case 'up':
        newField.position = { 
          row: field.position.row - 1, 
          col: field.position.col 
        };
        newField.size = { 
          width: field.size.width, 
          height: field.size.height + 1 
        };
        break;
        
      case 'left':
        newField.position = { 
          row: field.position.row, 
          col: field.position.col - 1 
        };
        newField.size = { 
          width: field.size.width + 1, 
          height: field.size.height 
        };
        break;
    }
    
    return newField;
  };

  // Shrink a component in the specified direction
  const shrinkComponent = (field: FieldConfig, direction: Direction): FieldConfig => {
    const newField = { ...field };
    
    switch (direction) {
      case 'down':
        newField.size = { 
          width: field.size.width, 
          height: field.size.height - 1 
        };
        break;
        
      case 'right':
        newField.size = { 
          width: field.size.width - 1, 
          height: field.size.height 
        };
        break;
        
      case 'up':
        newField.position = { 
          row: field.position.row + 1, 
          col: field.position.col 
        };
        newField.size = { 
          width: field.size.width, 
          height: field.size.height - 1 
        };
        break;
        
      case 'left':
        newField.position = { 
          row: field.position.row, 
          col: field.position.col + 1 
        };
        newField.size = { 
          width: field.size.width - 1, 
          height: field.size.height 
        };
        break;
    }
    
    return newField;
  };

  return {
    canExpand,
    canShrink,
    expandComponent,
    shrinkComponent
  };
}