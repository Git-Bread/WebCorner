<template>
  <div class="flex h-screen bg-background">
    <!-- Server Sidebar Component -->
    <ServerSidebar 
      :selected-server-id="selectedServerId"
      :server-data="serverData"
      :user-servers="userServers"
      :is-loading="isLoadingServerSelection || isLoading"
      @server-selected="handleServerSelection"
      @add-server="showCreateServerDialog = true"
      @join-server="showJoinServerDialog = true"
    />
    
    <!-- Main content area -->
    <div class="flex-1 overflow-auto">
      <!-- Only show headline when no server is selected -->
      <h1 v-if="!selectedServerId" class="font-bold text-3xl text-heading mb-6 p-8">Dashboard</h1>
      
      <ClientOnly>
        <template v-if="!isLoading && !isLoadingServerSelection && (!hasServers)">
          <!-- No servers message -->
          <NoServersMessage 
            @create-server="showCreateServerDialog = true"
            @join-server="showJoinServerDialog = true"
            class="p-8"
          />
        </template>
        
        <!-- Server content with field container when server is selected -->
        <template v-else-if="hasServers">
          <div 
            :class="{'p-8': !selectedServerId, 'p-0': selectedServerId}"
          >
            <div v-if="selectedServerId && serverData[selectedServerId]" class="h-full">
              <!-- Field Container for customizable grid layout with full height when server selected -->
              <fieldContainer
                :serverId="selectedServerId"
                :initialConfig="currentUserLayout"
                :isLoadingLayout="isLoadingLayout"
                @save-config="saveUserLayoutConfig"
                class="h-full"
              />
            </div>
            <DashboardContent v-else-if="!selectedServerId" :serverData="serverData" />
          </div>
        </template>
        
        <!-- Loading state -->
        <template v-else>
          <LoadingIndicator 
            message="Loading your servers..." 
            class="p-8"
          />
        </template>
      </ClientOnly>
    </div>
  </div>
  
  <!-- Create Server Dialog -->
  <CreateServerDialog 
    :is-open="showCreateServerDialog"
    :is-creating="isCreatingServer"
    @close="showCreateServerDialog = false"
    @create="handleCreateServer"
  />
  
  <!-- Join Server Dialog -->
  <JoinServerDialog 
    :is-open="showJoinServerDialog"
    :is-joining="isJoiningServer"
    @close="showJoinServerDialog = false"
    @join="handleJoinServer"
    @join-with-invite="handleJoinWithInvite"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

// Import components
import ServerSidebar from '~/components/dashboard/ServerSidebar.vue';
import NoServersMessage from '~/components/dashboard/NoServersMessage.vue';
import LoadingIndicator from '~/components/dashboard/LoadingIndicator.vue';
import CreateServerDialog from '~/components/dashboard/CreateServerDialog.vue';
import JoinServerDialog from '~/components/dashboard/JoinServerDialog.vue';
import fieldContainer from '~/components/dashboard/field/fieldContainer.vue';
import DashboardContent from '~/components/dashboard/DashboardContent.vue';

// Import specific server composables
import { useServerJoining, useServerInvitations, useServerLayouts } from '~/composables/server';
import { useServerCore } from '~/composables/server/useServerCore';
import type { DashboardFieldConfig } from '~/composables/server/useServerLayouts';
import { serverCache } from '~/utils/storageUtils/cacheUtil';
import { showToast } from '~/utils/toast';
import { useAuth } from '~/composables/useAuth';

// Define page meta with authenticated layout
definePageMeta({ layout: 'default-authed' });

// Use server composables directly in the dashboard - this is the ONLY place that should use useServerCore
const serverCore = useServerCore();

// Destructure the properties and methods from the server state for easier access
const { 
  userServers, 
  serverData, 
  isLoading, 
  isCreatingServer,
  loadUserServers, 
  createServer, 
  updateServerMetadata, 
  setCurrentServer, 
  loadUserServerList, 
  clearCurrentServer 
} = serverCore;

// Use other composables as needed
const { isJoiningServer, joinServer } = useServerJoining();
const { joinServerWithInvite } = useServerInvitations();
const { user } = useAuth();

// User-specific layout management
const { isLoadingLayout, loadUserLayout, saveUserLayout } = useServerLayouts();

const selectedServerId = ref<string | null>(null);
const currentUserLayout = ref<DashboardFieldConfig[]>([]);

// Loading state for server selection
const isLoadingServerSelection = ref(false);

// Computed property to check if user has servers
const hasServers = computed(() => {
  return userServers.value && userServers.value.length > 0;
});

// Dialog states
const showCreateServerDialog = ref(false);
const showJoinServerDialog = ref(false);

/**
 * Handle server selection with proper loading sequence
 * Now just a minimal wrapper that updates UI state and loads layouts
 */
const handleServerSelection = async (serverId: string | null) => {
  // Skip if the server is already selected (prevents unnecessary reloads)
  if (serverId === selectedServerId.value) {
    return;
  }
  
  // Skip if already loading another server selection - prevents race conditions
  if (isLoadingServerSelection.value) {
    console.log(`Server selection in progress, skipping request for ${serverId}`);
    return;
  }
  
  try {
    // Set loading state
    isLoadingServerSelection.value = true;
    
    // Update the selected server ID which triggers UI updates
    selectedServerId.value = serverId;
    
    // When serverId is null, clear the current server in useServerCore too
    if (serverId === null) {
      await clearCurrentServer();
      currentUserLayout.value = [];
      return; // Exit early
    }
    
    // Skip if we can't find the server in the loaded data
    if (!serverData.value[serverId]) {
      console.log(`Server ${serverId} not found in loaded data, skipping selection`);
      isLoadingServerSelection.value = false;
      return;
    }
    
    // Server selection is now handled internally by setCurrentServer with existing data
    // We only need to pass the server ID
    await setCurrentServer(serverId);
    
    // Now that server is selected, load the user-specific layout
    if (user.value) {
      const layout = await loadUserLayout<DashboardFieldConfig[]>(serverId);
      currentUserLayout.value = layout || [];
    }
  } catch (error) {
    console.error("Error during server selection:", error);
    showToast("Failed to load server data", "error");
    // Reset to null on error
    selectedServerId.value = null;
    currentUserLayout.value = [];
  } finally {
    isLoadingServerSelection.value = false;
  }
};

// Field configuration management
interface FieldPosition {
  row: number;
  col: number;
}

interface FieldConfig {
  id: string;
  title: string;
  componentType: string;
  size: { width: number; height: number };
  position: FieldPosition;
  props?: Record<string, any>;
  placeholder?: string;
}

// Save user-specific layout configuration
const saveUserLayoutConfig = async (config: DashboardFieldConfig[]) => {
  if (selectedServerId.value && user.value) {
    const success = await saveUserLayout<DashboardFieldConfig[]>(selectedServerId.value, config);
    if (success) {
      // Update the current layout
      currentUserLayout.value = config;
    }
  }
};

// Handle server creation
const handleCreateServer = async (serverInfo: { 
  name: string; 
  description: string; 
  server_img_url: string | null;
  maxMembers: number;
  components: Record<string, boolean>;
}) => {
  try {
    // We keep the dialog open during creation to show the loading state
    // The isCreatingServer state is already passed to the dialog via the isCreating prop
    
    const newServerId = await createServer(serverInfo);
    
    // Only close the dialog on success
    if (typeof newServerId === 'string') { // newServerId is the ID of the created server
      // Show success toast notification
      import('~/utils/toast').then(({ showToast }) => {
        showToast(`Server "${serverInfo.name}" created successfully!`, 'success', 3000);
      });
      
      // Close the dialog
      showCreateServerDialog.value = false;
      
      // Reload server list to get the new server
      await loadUserServerList();
      
      // Select the newly created server
      await handleServerSelection(newServerId);
    }
  } catch (error) {
    console.error('Error creating server:', error);
  }
};

// Handle joining a server directly with server ID
const handleJoinServer = async (serverId: string) => {
  try {
    // We'll keep the dialog open to show the loading state
    // The dialog already shows the loading state through isJoiningServer
    
    const result = await joinServer(serverId);
    
    // Close the dialog after the operation completes
    showJoinServerDialog.value = false;
    
    if (result && result.success && result.serverId) {
      // First ensure we wait for server data to be fully loaded
      await loadUserServerList();
      
      // Then select the newly joined server - this loads the layout
      await handleServerSelection(result.serverId);
    }
  } catch (error) {
    // Error is handled by joinServer method
  }
};

// Handle joining a server with an invitation code
const handleJoinWithInvite = async (inviteCode: string) => {
  try {
    // We'll keep the dialog open to show the loading state
    // The dialog already shows the loading state through isJoiningServer
    
    const result = await joinServerWithInvite(inviteCode);
    
    // Close the dialog after the operation completes
    showJoinServerDialog.value = false;
    
    if (result && result.success && result.serverId) {
      // First ensure we wait for server data to be fully loaded
      await loadUserServerList();
      
      // Then select the newly joined server - this loads the layout
      await handleServerSelection(result.serverId);
    }
  } catch (error) {
    // Error is handled by joinServerWithInvite method
    showJoinServerDialog.value = false;
  }
};
</script>