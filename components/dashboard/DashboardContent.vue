<template>
  <div>
    <!-- Main Content Area -->
    <div class="bg-surface border border-border rounded-lg">
      <template v-if="serverData && selectedServerId">
        <!-- Field Container when a server is selected -->
        <FieldContainer 
          ref="fieldContainerRef"
          :server-id="selectedServerId"
          :server-data="serverData[selectedServerId]"
          :initial-config="layoutConfig"
          :is-loading-layout="isLoadingLayout"
          @save-config="handleSaveFieldConfig"
          @before-navigate="handleBeforeNavigate"
        />
      </template>
      <template v-else>
        <!-- Welcome content when no server is selected -->
        <h3 class="text-xl text-heading mb-4 font-semibold">Welcome to WebCorner!</h3>
        <div class="bg-background p-4 border border-border rounded-md">
          <h4 class="font-medium text-theme-primary mb-3">Getting Started</h4>
          <ul class="space-y-3 text-text">
            <li class="flex items-start">
              <fa :icon="['fas', 'plus-circle']" class="text-theme-primary mr-2 mt-1 flex-shrink-0" />
              <span><strong>Create a Server</strong> - Start your own collaborative workspace by clicking "Create Server" in the sidebar.</span>
            </li>
            <li class="flex items-start">
              <fa :icon="['fas', 'sign-in-alt']" class="text-theme-primary mr-2 mt-1 flex-shrink-0" />
              <span><strong>Join a Server</strong> - Connect to an existing server using an invitation code or server ID by clicking "Join Server".</span>
            </li>
            <li class="flex items-start">
              <fa :icon="['fas', 'users']" class="text-theme-primary mr-2 mt-1 flex-shrink-0" />
              <span><strong>Invite Team Members</strong> - Once in a server, you can invite colleagues to collaborate with you.</span>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import FieldContainer from './field/fieldContainer.vue';
import { showToast } from '~/utils/toast';
import { useServerLayouts } from '~/composables/server/useServerLayouts';

// Accept server data as props from the parent component
const props = defineProps<{
  serverData: Record<string, any>;
  selectedServerId: string | null;
}>();

const emit = defineEmits(['update:serverData', 'save-before-navigate']);

// Reference to the FieldContainer component
const fieldContainerRef = ref<InstanceType<typeof FieldContainer> | null>(null);

// Use the server layouts composable
const { isLoadingLayout, loadUserLayout, saveUserLayout } = useServerLayouts();

// Store the layout configuration
const layoutConfig = ref<any[]>([]);

// Watch for server changes to load layout
watch(() => props.selectedServerId, async (newServerId) => {
  if (!newServerId) {
    layoutConfig.value = [];
    return;
  }
  
  // Load the user's layout for this server
  const layout = await loadUserLayout(newServerId);
  
  if (layout) {
    layoutConfig.value = layout;
  } else {
    // If no layout exists, use default or empty layout
    layoutConfig.value = props.serverData[newServerId]?.layout || [];
  }
}, { immediate: true });

// Handle saving field configuration back to the server
const handleSaveFieldConfig = async (config: any) => {
  if (!props.selectedServerId) return;
  
  try {
    // Save layout using the composable
    const success = await saveUserLayout(props.selectedServerId, config);
    
    if (success) {
      // Also update local state for immediate UI feedback
      const updatedServerData = { 
        ...props.serverData,
        [props.selectedServerId]: {
          ...props.serverData[props.selectedServerId],
          layout: config
        }
      };
      
      // Update the layout config
      layoutConfig.value = config;
      
      // Emit the updated server data to parent for local state updates
      emit('update:serverData', updatedServerData);
      
      showToast('Dashboard layout saved', 'success');
    } else {
      showToast('Failed to save dashboard layout', 'error');
    }
  } catch (error) {
    console.error('Error saving layout:', error);
    showToast('Failed to save dashboard layout', 'error');
  }
};

const handleBeforeNavigate = (event: { saved: boolean }) => {
  // Handle the event from the field container when saving is complete
  emit('save-before-navigate', event);
};

// Method that can be called by parent components when navigating away
const checkUnsavedChangesBeforeNavigate = () => {
  // If field container is available and server is selected, check for unsaved changes
  if (fieldContainerRef.value && props.selectedServerId) {
    return fieldContainerRef.value.checkAndSaveBeforeNavigate();
  }
  
  // No field container or no server selected, so no unsaved changes
  return false;
};

// Expose methods to parent components
defineExpose({
  checkUnsavedChangesBeforeNavigate
});
</script>