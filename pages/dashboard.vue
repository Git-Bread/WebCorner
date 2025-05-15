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
            <DashboardContent 
              ref="dashboardContentRef"
              :serverData="serverData" 
              :selectedServerId="selectedServerId"
              @update:serverData="serverData = $event"
              @save-before-navigate="handleSaveBeforeNavigate"
            />
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
import { ref, onMounted, computed, watch } from 'vue';

// Import components
import ServerSidebar from '~/components/dashboard/ServerSidebar.vue';
import NoServersMessage from '~/components/dashboard/NoServersMessage.vue';
import LoadingIndicator from '~/components/dashboard/LoadingIndicator.vue';
import CreateServerDialog from '~/components/dashboard/CreateServerDialog.vue';
import JoinServerDialog from '~/components/dashboard/JoinServerDialog.vue';
import DashboardContent from '~/components/dashboard/DashboardContent.vue';

// Import specific server composables
import { useServerJoining, useServerInvitations } from '~/composables/server';
import { useServerCore } from '~/composables/server/useServerCore';
import { showToast } from '~/utils/toast';
import { useAuth } from '~/composables/useAuth';

// Define page meta with authenticated layout
definePageMeta({ layout: 'default-authed' });

// Use server composables directly in the dashboard - this is the ONLY place that should use useServerCore
const serverCore = useServerCore();

// Destructure the properties and methods from the server state for easier access
const { 
  userServers, 
  isLoading, 
  isCreatingServer,
  createServer, 
  setCurrentServer, 
  loadUserServerList, 
  clearCurrentServer 
} = serverCore;

// Use reactive serverData with v-model behavior for DashboardContent
const serverData = ref(serverCore.serverData.value);

// Keep local serverData in sync with core serverData
watch(() => serverCore.serverData.value, (newData) => {
  serverData.value = newData;
});

// Use other composables as needed
const { isJoiningServer, joinServer } = useServerJoining();
const { joinServerWithInvite } = useServerInvitations();
const { user } = useAuth();

// Reference to the DashboardContent component
const dashboardContentRef = ref<InstanceType<typeof DashboardContent> | null>(null);

const selectedServerId = ref<string | null>(null);

// Get and set the last selected server from localStorage
const LAST_SERVER_KEY = 'webcorner_last_server';

// Save the last selected server ID to localStorage
const saveLastSelectedServer = (serverId: string | null) => {
  if (!serverId || !user.value) return;
  
  try {
    // Use user ID in the key to keep separate users' preferences distinct
    const storageKey = `${LAST_SERVER_KEY}_${user.value.uid}`;
    localStorage.setItem(storageKey, serverId);
  } catch (e) {
    // Handle any localStorage errors silently
    console.error('Error saving last server to localStorage:', e);
  }
};

// Get the last selected server ID from localStorage
const getLastSelectedServer = (): string | null => {
  if (!user.value) return null;
  
  try {
    const storageKey = `${LAST_SERVER_KEY}_${user.value.uid}`;
    return localStorage.getItem(storageKey);
  } catch (e) {
    // Handle any localStorage errors silently
    console.error('Error reading last server from localStorage:', e);
    return null;
  }
};

// Handle the event when saving before navigation is complete
const handleSaveBeforeNavigate = (event: { saved: boolean }) => {
  // You can perform any additional actions here after the save is complete
  if (event.saved) {
    showToast('Layout saved successfully', 'success');
  }
};

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
    // Check if there are unsaved changes and save them first
    if (dashboardContentRef.value && selectedServerId.value) {
      dashboardContentRef.value.checkUnsavedChangesBeforeNavigate();
    }
    
    // Set loading state
    isLoadingServerSelection.value = true;
    
    // Update the selected server ID which triggers UI updates
    selectedServerId.value = serverId;
    
    // Save this server as the last selected one
    if (serverId) {
      saveLastSelectedServer(serverId);
    }
    
    // When serverId is null, clear the current server in useServerCore too
    if (serverId === null) {
      await clearCurrentServer();
      return;
    }
    
    // Skip if server doesn't exist in loaded data
    if (!serverData.value[serverId]) {
      console.log(`Server ${serverId} not found in loaded data, skipping selection`);
      isLoadingServerSelection.value = false;
      return;
    }
    
    // Pass server ID to context manager
    await setCurrentServer(serverId);
    
  } catch (error) {
    console.error("Error during server selection:", error);
    showToast("Failed to load server data", "error");
    // Reset to null on error
    selectedServerId.value = null;
  } finally {
    isLoadingServerSelection.value = false;
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
    // Keep dialog open during creation to show loading state
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
    // Keep dialog open to show the loading state
    // The dialog already shows the loading state through isJoiningServer
    
    const result = await joinServer(serverId);
    
    // Close the dialog after the operation completes
    showJoinServerDialog.value = false;
    
    if (result && result.success && result.serverId) {
      // Ensure server data is fully loaded
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
    // Keep dialog open to show the loading state
    // The dialog already shows the loading state through isJoiningServer
    
    const result = await joinServerWithInvite(inviteCode);
    
    // Close the dialog after the operation completes
    showJoinServerDialog.value = false;
    
    if (result && result.success && result.serverId) {
      // Ensure server data is fully loaded
      await loadUserServerList();
      
      // Then select the newly joined server - this loads the layout
      await handleServerSelection(result.serverId);
    }
  } catch (error) {
    // Error is handled by joinServerWithInvite method
    showJoinServerDialog.value = false;
  }
};

// Initialize dashboard and load last selected server
onMounted(async () => {
  try {
    // First, load the user's servers
    await loadUserServerList();
    
    // After servers are loaded, try to restore the last selected server
    if (hasServers.value) {
      const lastServerId = getLastSelectedServer();
      
      // Only select the server if it exists in the user's servers
      if (lastServerId && serverData.value[lastServerId]) {
        await handleServerSelection(lastServerId);
      }
    }
  } catch (error) {
    console.error("Error initializing dashboard:", error);
  }
});
</script>