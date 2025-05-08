// This file serves as a central registry for all field components
// that can be used in the field container

import { markRaw } from 'vue'
import NewsComponent from './fieldComponents/NewsComponent.vue'
import ActivityComponent from './fieldComponents/ActivityComponent.vue'
import ChatComponent from './fieldComponents/ChatComponent.vue'
import GroupsComponent from './fieldComponents/GroupsComponent.vue'

// Component registry - maps component types to their implementations
export const componentRegistry: Record<string, any> = {
  news: NewsComponent,
  activity: ActivityComponent, 
  chat: ChatComponent,
  groups: GroupsComponent,
}

// Component metadata for UI display
export const componentMetadata: Record<string, {
  label: string;
  icon: string;
  description: string;
  category: string;
}> = {
  news: {
    label: 'News & Announcements',
    icon: 'newspaper',
    description: 'Post announcements and updates for all members to see.',
    category: 'functional'
  },
  activity: {
    label: 'Server Activity',
    icon: 'chart-bar',
    description: 'View recent activity across your server.',
    category: 'admin'
  },
  chat: {
    label: 'Chat',
    icon: 'comment-dots',
    description: 'Real-time messaging for all server members.',
    category: 'functional'
  },
  groups: {
    label: 'Member Groups',
    icon: 'users',
    description: 'Organize members into different groups with custom permissions.',
    category: 'admin'
  }
}

// Helper function to get all available component types
export const getAvailableComponentTypes = () => {
  const types = Object.keys(componentMetadata).map(key => ({
    value: key,
    label: componentMetadata[key].label,
    icon: componentMetadata[key].icon,
    description: componentMetadata[key].description,
    category: componentMetadata[key].category
  }));
  return types;
}

// Export the registry resolution function for dynamic component loading
export const resolveComponent = (type: string) => {
  try {
    const component = componentRegistry[type];
    
    if (!component) {
      return null;
    }
    
    // Make sure the component is not reactive to avoid performance issues
    const rawComponent = markRaw(component);
    
    return rawComponent;
  } catch (error) {
    return null;
  }
}