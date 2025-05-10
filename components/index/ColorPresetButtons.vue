<template>
  <div>
    <label class="block font-medium text-heading mb-2">{{ label }}</label>
    
    <div class="grid grid-cols-3 gap-2">
      <button 
        v-for="preset in presetOptions"
        :key="preset.id"
        @click="selectPreset(preset.id)" 
        class="h-10 rounded-md border hover:border-theme-primary transition-colors relative overflow-hidden"
        :class="{'border-2 border-theme-primary shadow-sm': modelValue === preset.id, 'border-border': modelValue !== preset.id}"
        :title="preset.title"
        :aria-pressed="modelValue === preset.id">
        
        <!-- Small dot representation -->
        <div class="absolute inset-0 flex items-center justify-center">
          <div 
            class="w-6 h-6 rounded-full"
            :style="getRepresentativeStyle(preset)">
          </div>
        </div>
        
        <!-- Selection indicator -->
        <div v-if="modelValue === preset.id" class="absolute inset-0 flex items-center justify-center">
          <div class="h-8 w-8 rounded-full border-2 border-theme-primary"></div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">


// Define the interface for color presets
interface ColorPreset {
  id: string;
  style: string;
  title: string;
}

// Color mapping for accurate representation as small dots
const presetRepresentativeColors: Record<string, string> = {
  // Particle presets - simplified to match how they appear as small dots
  'solid-purple': 'rgba(139, 92, 246, 0.9)',
  'aurora': '#4f46e5', // Dominant color in small dots
  'cyberpunk': '#d946ef', // Dominant color in small dots 
  'electric-lime': '#a3e635', // Dominant color in small dots
  'candy': '#f472b6', // Dominant color in small dots
  'sunset-glow': '#f97316', // Dominant color in small dots
  'neon': '#00ffcc', // Cyan-yellow mixing creates a turquoise/aqua color
  'dark-contrast': '#1e1e1e',
  'white-glow': '#ffffff',
  'solid-blue': 'rgba(96, 165, 250, 0.9)',
  'cosmic-blue': '#60a5fa', // Dominant color in small dots
  'solid-green': 'rgba(52, 211, 153, 0.9)',
  
  // Interaction presets - these are already single colors
  'teal': '#14b8a6',
  'pink': '#f472b6',
  'purple': '#8b5cf6',
  'gold': '#facc15',
  'red': '#ef4444',
  'blue': '#3b82f6'
};

// Define props with types
const props = defineProps({
  label: {
    type: String,
    required: true
  },
  modelValue: {
    type: String,
    required: true
  },
  presetOptions: {
    type: Array as () => ColorPreset[],
    required: true,
    validator: (array: any[]) => 
      array.every(item => 
        typeof item === 'object' && 
        'id' in item && 
        'style' in item && 
        'title' in item
      )
  }
});

// Define emits
const emit = defineEmits(['update:modelValue']);

// Method to handle preset selection
const selectPreset = (presetId: string) => {
  emit('update:modelValue', presetId);
};

// Get a more accurate representative style for the small buttons
const getRepresentativeStyle = (preset: ColorPreset) => {
  // If we have a specific color mapping for this preset, use it
  if (preset.id in presetRepresentativeColors) {
    return { background: presetRepresentativeColors[preset.id] };
  }
  
  // Fallback to the original style
  return { background: preset.style };
};
</script>