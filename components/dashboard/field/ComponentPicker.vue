<template>
  <div class="component-picker bg-background p-4">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-heading font-medium">{{ selectedCategory ? 'Select a Component' : 'Select Category' }}</h3>
      <button 
        @click="backOrCancel" 
        class="text-text-muted hover:text-theme-primary text-lg"
        aria-label="Close component picker"
      >
        <fa :icon="['fas', selectedCategory ? 'arrow-left' : 'times']" />
      </button>
    </div>
    
    <!-- Category selection view -->
    <div v-if="!selectedCategory" class="grid grid-cols-1 gap-4">
      <div 
        v-for="category in categories"
        :key="category.id"
        @click="selectCategory(category.id)"
        class="component-card flex bg-surface border border-border rounded-md p-4 cursor-pointer hover:border-theme-primary transition-colors"
      >
        <div class="flex-shrink-0 mr-4">
          <div class="w-12 h-12 border-2 border-theme-primary rounded-md flex items-center justify-center">
            <fa :icon="['fas', category.icon]" class="text-theme-primary icon-md" />
          </div>
        </div>
        <div class="flex-grow">
          <h4 class="font-medium text-heading text-base mb-2">{{ category.name }}</h4>
          <p class="text-text-muted text-sm">{{ category.description }}</p>
        </div>
      </div>
    </div>
    
    <!-- Component selection view -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div 
        v-for="componentType in filteredComponentTypes"
        :key="componentType.value"
        @click="selectComponent(componentType)"
        class="component-card flex bg-surface border border-border rounded-md p-3 cursor-pointer hover:border-theme-primary transition-colors"
      >
        <div class="flex-shrink-0 mr-3">
          <div class="w-10 h-10 border border-theme-primary rounded-md flex items-center justify-center">
            <fa :icon="['fas', componentType.icon]" class="text-theme-primary text-xl" />
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
import { ref, computed, onMounted, watch } from 'vue';
import { useServerPermissions } from '~/composables/server/useServerPermissions';
import { useServerCore } from '~/composables/server/useServerCore';

// Define the component type interface
interface ComponentType {
  value: string;
  label: string;
  icon: string;
  description: string;
  category: string;
}

interface SelectComponentEvent {
  componentType: string;
  title: string;
  position: { row: number; col: number };
}

const props = defineProps<{
  position: { row: number; col: number };
  availableComponentTypes: ComponentType[];
  serverId?: string;
}>();

const emit = defineEmits<{
  'select-component': [event: SelectComponentEvent];
  'cancel': [];
}>();

// Get server permissions and core functionality
const { isServerAdminOrOwner, isServerOwner } = useServerPermissions();
const { currentServerId } = useServerCore();

// Track if user is admin
const isAdmin = ref(false);
const isChecking = ref(true);

// Check admin status on component mount
onMounted(async () => {
  await checkAdminStatus();
});

// Watch for changes to currentServerId and update admin status
watch(currentServerId, async () => {
  await checkAdminStatus();
}, { immediate: true });

// Function to check admin status
async function checkAdminStatus(): Promise<boolean> {
  isChecking.value = true;
  try {
    // Use serverId prop if available, otherwise fall back to currentServerId from composable
    const effectiveServerId = props.serverId || currentServerId.value;
    
    if (effectiveServerId) {
      // First check if user is owner, which is more definitive
      const ownerStatus = await isServerOwner(effectiveServerId);
      
      if (ownerStatus) {
        isAdmin.value = true;
        return true;
      }
      
      // If not owner, check if admin
      const adminStatus = await isServerAdminOrOwner(effectiveServerId);
      isAdmin.value = adminStatus;
      return adminStatus;
    } else {
      isAdmin.value = false;
      return false;
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
    isAdmin.value = false;
    return false;
  } finally {
    isChecking.value = false;
  }
}

// Define categories
const allCategories = [
  { 
    id: 'functional', 
    name: 'Functional', 
    icon: 'tools', 
    description: 'Components that provide core functionalities for your server.',
    requiresAdmin: false
  },
  { 
    id: 'admin', 
    name: 'Admin', 
    icon: 'shield-alt', 
    description: 'Components for managing server members and permissions.',
    requiresAdmin: true
  },
  { 
    id: 'decorative', 
    name: 'Decorative', 
    icon: 'paint-brush', 
    description: 'Components for enhancing the visual appearance of your server.',
    requiresAdmin: false
  }
];

// Filter categories based on user permissions
const categories = computed(() => {
  return allCategories.filter(category => !category.requiresAdmin || isAdmin.value);
});

// Track the selected category
const selectedCategory = ref<string | null>(null);

// Filter components by selected category and user permissions
const filteredComponentTypes = computed(() => {
  if (!selectedCategory.value) return [];
  
  // For non-admins, filter out admin components regardless of selected category
  return props.availableComponentTypes.filter(comp => {
    const category = comp.category || 'functional';
    
    // If user is not admin, don't show admin components
    if (category === 'admin' && !isAdmin.value) {
      return false;
    }
    
    return category === selectedCategory.value;
  });
});

// Select a category
const selectCategory = (categoryId: string) => {
  selectedCategory.value = categoryId;
};

// Back button or cancel function
const backOrCancel = () => {
  if (selectedCategory.value) {
    // Go back to category selection
    selectedCategory.value = null;
  } else {
    // Cancel the whole component picking
    emit('cancel');
  }
};

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