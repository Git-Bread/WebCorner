// Types and interfaces for the field grid components

export interface FieldPosition {
  row: number;
  col: number;
}

export interface FieldConfig {
  id: string;
  title: string;
  componentType: string;
  size: { width: number; height: number };
  position: FieldPosition;
  props?: Record<string, any>;
  placeholder?: string;
}

export interface ComponentSelection {
  componentType: string;
  title: string;
  position: FieldPosition;
}

export type Direction = 'up' | 'right' | 'down' | 'left';

// Grid configuration constants
export const GRID_CONSTANTS = {
  TOTAL_GRID_ROWS: 16,
  GRID_COLS: 4
};