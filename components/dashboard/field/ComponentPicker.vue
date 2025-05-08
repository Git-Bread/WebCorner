<template>
  <div class="component-picker bg-background p-4">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-heading font-medium">Select a Component</h3>
      <button 
        @click="$emit('cancel')" 
        class="text-text-muted hover:text-theme-primary text-lg"
        aria-label="Close component picker"
      >
        <fa :icon="['fas', 'times']" />
      </button>
    </div>
    
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div 
        v-for="componentType in availableComponentTypes"
        :key="componentType.value"
        @click="selectComponent(componentType)"
        class="component-card flex bg-surface border border-border rounded-md p-3 cursor-pointer hover:border-theme-primary transition-colors"
      >
        <div class="flex-shrink-0 mr-3">
          <div class="w-10 h-10 rounded-full bg-theme-primary bg-opacity-20 flex items-center justify-center">
            <fa :icon="['fas', componentType.icon]" class="text-theme-primary" />
          </div>
        </div>
        <div class="flex-grow">
          <h4 class="font-medium text-heading text-sm mb-1">{{ componentType.label }}</h4>
          <p class="text-text-muted text-xs">{{ componentType.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Define the component type interface
interface ComponentType {
  value: string;
  label: string;
  icon: string;
  description: string;
}

interface SelectComponentEvent {
  componentType: string;
  title: string;
  position: { row: number; col: number };
}

const props = defineProps<{
  position: { row: number; col: number };
  availableComponentTypes: ComponentType[];
}>();

const emit = defineEmits<{
  'select-component': [event: SelectComponentEvent];
  'cancel': [];
}>();

const selectComponent = (componentType: ComponentType) => {
  // Create the event data
  const eventData: SelectComponentEvent = {
    componentType: componentType.value,
    title: componentType.label,
    position: props.position
  };
  
  // Emit the event
  emit('select-component', eventData);
};
</script>

<style scoped>
.component-picker {
  height: 100%;
  overflow-y: auto;
}

.component-card {
  transition: all 0.2s ease;
}

.component-card:hover {
  transform: translateY(-2px);
}
</style>