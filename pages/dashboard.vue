<template>
  <div class="flex h-screen bg-background">
    <!-- Server Sidebar Component -->
    <ServerSidebar 
      :selected-server-id="selectedServerId"
      @server-selected="handleServerSelection"
      @add-server="showCreateServerDialog = true"
      @join-server="showJoinServerDialog = true"
    />
    
    <!-- Main content area -->
    <div class="flex-1 overflow-auto">
      <!-- Only show headline when no server is selected -->
      <h1 v-if="!selectedServerId" class="font-bold text-3xl text-heading mb-6 p-8">Dashboard</h1>
      
      <!-- No servers message -->
      <NoServersMessage 
        v-if="!isLoading && (!hasServers)"
        @create-server="showCreateServerDialog = true"
        @join-server="showJoinServerDialog = true"
        class="p-8"
      />
      
      <!-- Server content with field container when server is selected -->
      <div 
        v-else-if="hasServers" 
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
        <DashboardContent v-else-if="!selectedServerId" />
      </div>
      
      <!-- Loading state -->
      <LoadingIndicator 
        v-else 
        message="Loading your servers..." 
        class="p-8"
      />
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
import fieldContainer from '~/components/dashboard/field/fieldContainer.vue';
import DashboardContent from '~/components/dashboard/DashboardContent.vue';

// Import specific server composables
import { useServerCore, useServerJoining, useServerInvitations, useServerLayouts } from '~/composables/server';
import type { DashboardFieldConfig } from '~/composables/server/useServerLayouts';
import { serverCache } from '~/utils/storageUtils/cacheUtil';

// Define page meta with authenticated layout
definePageMeta({ layout: 'default-authed' });

// Use the specific server composables
const { userServers, serverData, isLoading, isCreatingServer, loadUserServers, createServer, updateServerMetadata, setCurrentServer, loadUserServerList, clearCurrentServer } = useServerCore();
const { isJoiningServer, joinServer } = useServerJoining();
const { joinServerWithInvite } = useServerInvitations();
const { user } = useAuth();

// User-specific layout management
const {isLoadingLayout, loadUserLayout, saveUserLayout } = useServerLayouts();

const selectedServerId = ref<string | null>(null);
const currentUserLayout = ref<DashboardFieldConfig[]>([]);

// Computed property to check if user has servers
const hasServers = computed(() => {
  return userServers.value && userServers.value.length > 0;
});

// Dialog states
const showCreateServerDialog = ref(false);
const showJoinServerDialog = ref(false);

// Handle server selection, save to localStorage, and load user layout
const handleServerSelection = async (serverId: string | null) => {
  // Skip if the server is already selected (prevents unnecessary reloads)
  if (serverId === selectedServerId.value) {
    return;
  }
  
  // Update the selected server ID which triggers UI updates
  selectedServerId.value = serverId;
  
  // When serverId is null, clear the current server in useServerCore too
  if (serverId === null) {
    // Use the composable's clearCurrentServer method
    await clearCurrentServer();
    
    // Clear the layout
    currentUserLayout.value = [];
    return; // Exit early
  }
  
  // Save to cache when user is logged in and serverId exists
  if (user.value && serverId) {
    // Make sure the server is set as current in useServerCore
    await setCurrentServer(serverId);
    
    // Load the user-specific layout for this server
    const layout = await loadUserLayout<DashboardFieldConfig>(serverId);
    if (layout) {
      currentUserLayout.value = layout;
    } else {
      // If no layout is found, use an empty array
      currentUserLayout.value = [];
    }
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
    const success = await saveUserLayout<DashboardFieldConfig>(selectedServerId.value, config);
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

// Watch for server selection changes
watch(() => selectedServerId.value, async (newServerId) => {
  if (newServerId && user.value) {
    // Ensure server data is available
    if (!serverData.value[newServerId]) {
      // We need to use loadUserServers here since we need the full server data
      await loadUserServers();
    }
    
    // Load user layout when server selection changes
    const layout = await loadUserLayout<DashboardFieldConfig>(newServerId);
    if (layout) {
      currentUserLayout.value = layout;
    } else {
      currentUserLayout.value = [];
    }
  } else {
    // Clear current layout when no server is selected
    currentUserLayout.value = [];
  }
});

// Load servers on component mount
onMounted(async () => {
  // Use the optimized method to load only server list
  await loadUserServerList();
  
  // Get route parameters to see if a specific server is requested
  const router = useRouter();
  const route = useRoute();
  const requestedServerId = route.query.serverId as string | undefined;
  
  // Check if we've navigated to this page directly/via refresh
  // This helps us determine if we need to force a server data refresh
  const isPageRefresh = !document.referrer || document.referrer.includes(window.location.host);
  
  // If it's a page refresh, ensure server data is loaded properly
  if (isPageRefresh && userServers.value.length > 0) {
    await loadUserServers(); // Force a full server data load
  }
  
  // If there's a specific server requested in the URL, select that one
  if (requestedServerId && userServers.value.some(s => s.serverId === requestedServerId)) {
    await handleServerSelection(requestedServerId);
    return;
  }
  
  // Try to restore the last selected server from cache
  if (user.value && userServers.value.length > 0) {
    const lastSelectedServerId = serverCache.getLastSelectedServer(user.value.uid);
    
    if (lastSelectedServerId && userServers.value.some(s => s.serverId === lastSelectedServerId)) {
      await handleServerSelection(lastSelectedServerId);
      return;
    }
  }
  
  // Make sure server data is loaded though for the list
  if (userServers.value.length > 0) {
    const serversWithoutData = userServers.value.filter(s => !serverData.value[s.serverId]);
    if (serversWithoutData.length > 0) {
      await loadUserServers();
    }
  }
});
</script>