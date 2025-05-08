// This file serves as a central registry for all field components
// that can be used in the field container

import { markRaw, defineAsyncComponent } from 'vue'
import NewsComponent from './fieldComponents/NewsComponent.vue'
import ActivityComponent from './fieldComponents/ActivityComponent.vue'
import ChatComponent from './fieldComponents/ChatComponent.vue'
import GroupsComponent from './fieldComponents/GroupsComponent.vue'
// Import any future components here

console.log('FieldComponentRegistry: Loading component imports');

// Component registry - maps component types to their implementations
export const componentRegistry: Record<string, any> = {
  news: NewsComponent,
  activity: ActivityComponent, 
  chat: ChatComponent,
  groups: GroupsComponent,
  // Future components will be added here
}

console.log('FieldComponentRegistry: Component registry initialized with keys:', Object.keys(componentRegistry));

// Component metadata for UI display
export const componentMetadata: Record<string, {
  label: string;
  icon: string;
  description: string;
}> = {
  news: {
    label: 'News & Announcements',
    icon: 'newspaper',
    description: 'Post announcements and updates for all members to see.'
  },
  activity: {
    label: 'Server Activity',
    icon: 'chart-bar',
    description: 'View recent activity across your server.'
  },
  chat: {
    label: 'Chat',
    icon: 'comment-dots',
    description: 'Real-time messaging for all server members.'
  },
  groups: {
    label: 'Member Groups',
    icon: 'users',
    description: 'Organize members into different groups with custom permissions.'
  }
  // Removed calendar and tasks since they don't have implementations yet
  // Add them back when the components are created
}

// Helper function to get all available component types
export const getAvailableComponentTypes = () => {
  console.log('FieldComponentRegistry: getAvailableComponentTypes called');
  const types = Object.keys(componentMetadata).map(key => ({
    value: key,
    label: componentMetadata[key].label,
    icon: componentMetadata[key].icon,
    description: componentMetadata[key].description
  }));
  console.log('FieldComponentRegistry: Available component types:', types);
  return types;
}

// Export the registry resolution function for dynamic component loading
export const resolveComponent = (type: string) => {
  console.log('FieldComponentRegistry: resolveComponent called for type:', type);
  
  try {
    const component = componentRegistry[type];
    
    if (!component) {
      console.warn(`FieldComponentRegistry: Component type "${type}" not found in registry`);
      return null;
    }
    
    console.log('FieldComponentRegistry: Component found for type:', type);
    // Make sure the component is not reactive to avoid performance issues
    const rawComponent = markRaw(component);
    console.log('FieldComponentRegistry: Component marked as raw');
    
    return rawComponent;
  } catch (error) {
    console.error('FieldComponentRegistry: Error resolving component:', error);
    return null;
  }
}