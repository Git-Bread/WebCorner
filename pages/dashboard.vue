<template>
  <div class="flex h-screen bg-background">
    <!-- Server Sidebar Component -->
    <ServerSidebar 
      :servers="userServers" 
      :server-data="serverData" 
      :is-loading="isLoading" 
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

// Import specific server composables
import { useServerCore, useServerJoining, useServerInvitations, useServerLayouts } from '~/composables/server';
// Import server storage utilities
import { saveLastSelectedServer, getLastSelectedServer } from '~/utils/serverStorageUtils';

// Define page meta with authenticated layout
definePageMeta({ layout: 'default-authed' });

// Use the specific server composables
const { userServers, serverData, isLoading, isCreatingServer, loadUserServerList, loadUserServers, createServer, updateServerMetadata, setCurrentServer } = useServerCore();
const { isJoiningServer, joinServer } = useServerJoining();
const { joinServerWithInvite } = useServerInvitations();
const { user } = useAuth();

// User-specific layout management
const {isLoadingLayout, loadUserLayout, saveUserLayout } = useServerLayouts();

const selectedServerId = ref<string | null>(null);
const currentUserLayout = ref<FieldConfig[]>([]);

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
    console.log("Server already selected:", serverId);
    return;
  }
  
  console.log("Selecting server:", serverId);
  
  // Update the selected server ID which triggers UI updates
  selectedServerId.value = serverId;
  
  // Save to localStorage when user is logged in
  if (user.value && serverId) {
    // Save this as the last selected server
    saveLastSelectedServer(serverId, user.value.uid);
    
    // Make sure the server is set as current in useServerCore
    await setCurrentServer(serverId);
    
    // Load the user-specific layout for this server
    console.log("Loading layout for server:", serverId);
    const layout = await loadUserLayout(serverId);
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
const saveUserLayoutConfig = async (config: FieldConfig[]) => {
  if (selectedServerId.value && user.value) {
    const success = await saveUserLayout(selectedServerId.value, config);
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
    
    const result = await createServer(serverInfo);
    
    // Only close the dialog on success
    if (result === null) { // null means success
      // Show success toast notification
      import('~/utils/toast').then(({ showToast }) => {
        showToast(`Server "${serverInfo.name}" created successfully!`, 'success', 3000);
      });
      
      // Close the dialog
      showCreateServerDialog.value = false;
      
      // Wait briefly for server data to be updated, then select the new server
      setTimeout(async () => {
        // Find and select the newly created server using server data
        // Find the server ID based on the name (assuming names are unique for now, or use a better method if not)
        // This part might need refinement if names aren't unique or if createServer returns the ID
        const newServer = userServers.value.find(s => 
          serverData.value[s.serverId]?.name === serverInfo.name &&
          serverData.value[s.serverId]?.ownerId === useAuth().user.value?.uid // Add owner check for more robustness
        );
        if (newServer) {
          handleServerSelection(newServer.serverId); // Use handleServerSelection to also save to localStorage
        }
      }, 500); // Keep a small delay to allow reactivity to settle
    }
  } catch (error) {
    console.error('Error creating server:', error);
    // Dialog will remain open, showing any error state
  }
    
  // Wait briefly for server data to be updated, then select the new server
  setTimeout(async () => {
    // Find and select the newly created server using server data
    // Find the server ID based on the name (assuming names are unique for now, or use a better method if not)
    // This part might need refinement if names aren't unique or if createServer returns the ID
    const newServer = userServers.value.find(s => 
      serverData.value[s.serverId]?.name === serverInfo.name &&
      serverData.value[s.serverId]?.ownerId === useAuth().user.value?.uid // Add owner check for more robustness
    );
    if (newServer) {
      handleServerSelection(newServer.serverId); // Use handleServerSelection to also save to localStorage
    }
  }, 500); // Keep a small delay to allow reactivity to settle
}

// Handle joining a server directly with server ID
const handleJoinServer = async (serverId: string) => {
  try {
    // We'll keep the dialog open to show the loading state
    // The dialog already shows the loading state through isJoiningServer
    
    const joinedServerId = await joinServer(serverId);
    
    // Close the dialog after the operation completes
    showJoinServerDialog.value = false;
    
    if (joinedServerId) {
      // First ensure we wait for server data to be fully loaded - use optimized method
      await loadUserServerList();
      
      // Then select the newly joined server - this loads the layout
      await handleServerSelection(joinedServerId);
      
      // No navigations needed - we're just updating the selected server in the UI
      console.log("Server joined and selected:", joinedServerId);
    }
  } catch (error) {
    console.error('Error joining server:', error);
  }
};

// Handle joining a server with an invitation code
const handleJoinWithInvite = async (inviteCode: string) => {
  try {
    // We'll keep the dialog open to show the loading state
    // The dialog already shows the loading state through isJoiningServer
    
    const joinedServerId = await joinServerWithInvite(inviteCode);
    
    // Close the dialog after the operation completes
    showJoinServerDialog.value = false;
    
    if (joinedServerId) {
      // First ensure we wait for server data to be fully loaded - use optimized method
      await loadUserServerList();
      
      // Then select the newly joined server - this loads the layout
      await handleServerSelection(joinedServerId);
      
      // No navigations needed - we're just updating the selected server in the UI
      console.log("Server joined with invite and selected:", joinedServerId);
    }
  } catch (error) {
    console.error("Error joining server with invite:", error);
    showJoinServerDialog.value = false;
  }
};

// Watch for server selection changes
watch(() => selectedServerId.value, async (newServerId) => {
  console.log(`Selected server changed to: ${newServerId || 'none'}`);
  
  if (newServerId && user.value) {
    // Ensure server data is available
    if (!serverData.value[newServerId]) {
      console.log(`Server data missing for ${newServerId}, loading server data`);
      // We need to use loadUserServers here since we need the full server data
      await loadUserServers();
    }
    
    // Load user layout when server selection changes
    const layout = await loadUserLayout(newServerId);
    if (layout) {
      console.log(`Loaded layout with ${layout.length} fields for server ${newServerId}`);
      currentUserLayout.value = layout;
    } else {
      console.log(`No layout found for server ${newServerId}, using default empty layout`);
      currentUserLayout.value = [];
    }
  } else {
    // Clear current layout when no server is selected
    console.log('No server selected, clearing layout');
    currentUserLayout.value = [];
  }
});

// Load servers on component mount
onMounted(async () => {
  // Use the optimized method to load only server list
  await loadUserServerList();
  console.log(`Loaded ${userServers.value.length} servers`);
  
  // After servers are loaded, check if we have a previously selected server in localStorage
  if (user.value && hasServers.value && !selectedServerId.value) {
    const lastSelectedServerId = getLastSelectedServer(user.value.uid);
    console.log(`Last selected server from localStorage: ${lastSelectedServerId || 'none'}`);
    
    // Verify that the server exists in the user's server list before selecting it
    if (lastSelectedServerId && userServers.value.some(s => s.serverId === lastSelectedServerId)) {
      console.log(`Found previously selected server ${lastSelectedServerId} in user's servers`);
      // Set the selected server and load user layout
      await handleServerSelection(lastSelectedServerId);
    } else if (userServers.value.length > 0) {
      // If no last selected server, default to the first one
      const firstServerId = userServers.value[0].serverId;
      console.log(`No last selected server, defaulting to first server: ${firstServerId}`);
      await handleServerSelection(firstServerId);
    } else {
      console.log('No servers available to select');
    }
  } else {
    console.log(`Server selection status: user=${!!user.value}, hasServers=${hasServers.value}, selectedServerId=${selectedServerId.value}`);
  }
});
</script>