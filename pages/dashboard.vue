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
            :initialConfig="getServerFieldConfig()"
            @save-config="saveServerFieldConfig"
            class="h-full"
          />
        </div>
        <div v-else class="bg-surface border border-border rounded-lg p-6">
          <!-- Welcome message when no server is selected -->
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

// Import specific server composables instead of the combined useServerActions
import { useServerCore, useServerJoining, useServerInvitations } from '~/composables/server';
// Import server storage utilities
import { saveLastSelectedServer, getLastSelectedServer } from '~/utils/serverStorageUtils';

// Define page meta with authenticated layout
definePageMeta({ layout: 'default-authed' });

// Use the specific server composables
const { userServers, serverData, isLoading, isCreatingServer, loadUserServers, createServer, updateServerMetadata } = useServerCore();
const { isJoiningServer, joinServer } = useServerJoining();
const { joinServerWithInvite } = useServerInvitations();
const { user } = useAuth();

const selectedServerId = ref<string | null>(null);

// Computed property to check if user has servers
const hasServers = computed(() => {
  return userServers.value && userServers.value.length > 0;
});

// Dialog states
const showCreateServerDialog = ref(false);
const showJoinServerDialog = ref(false);

// Handle server selection and save to localStorage
const handleServerSelection = (serverId: string | null) => {
  selectedServerId.value = serverId;
  
  // Save to localStorage when user is logged in
  if (user.value) {
    saveLastSelectedServer(serverId, user.value.uid);
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
  size: 'small' | 'medium' | 'large';
  position: FieldPosition;
  props?: Record<string, any>;
  placeholder?: string;
}

// Get field configuration for the selected server
const getServerFieldConfig = () => {
  if (selectedServerId.value && serverData.value[selectedServerId.value]) {
    return serverData.value[selectedServerId.value].fieldConfig || [];
  }
  return [];
};

// Save field configuration to the server
const saveServerFieldConfig = async (config: FieldConfig[]) => {
  if (selectedServerId.value) {
    try {
      await updateServerMetadata(selectedServerId.value, {
        fieldConfig: config
      });
      
      // Show success toast notification
      import('~/utils/toast').then(({ showToast }) => {
        showToast('Dashboard layout saved successfully!', 'success', 3000);
      });
    } catch (error) {
      console.error('Error saving field configuration:', error);
      
      // Show error toast notification
      import('~/utils/toast').then(({ showToast }) => {
        showToast('Failed to save dashboard layout', 'error', 3000);
      });
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
  const result = await createServer(serverInfo);
  
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
};

// Handle joining a server directly with server ID
const handleJoinServer = async (serverId: string) => {
  const joinedServerId = await joinServer(serverId);
  if (joinedServerId) {
    showJoinServerDialog.value = false;
    // Select the newly joined server
    handleServerSelection(joinedServerId); // Use handleServerSelection to also save to localStorage
  }
};

// Handle joining a server with an invitation code
const handleJoinWithInvite = async (inviteCode: string) => {
  const joinedServerId = await joinServerWithInvite(inviteCode);
  if (joinedServerId) {
    showJoinServerDialog.value = false;
    // Select the newly joined server
    handleServerSelection(joinedServerId); // Use handleServerSelection to also save to localStorage
  }
};

// Load user's servers on component mount
onMounted(async () => {
  await loadUserServers();
  
  // After servers are loaded, check if we have a previously selected server in localStorage
  if (user.value && hasServers.value && !selectedServerId.value) {
    const lastSelectedServerId = getLastSelectedServer(user.value.uid);
    
    // Verify that the server exists in the user's server list before selecting it
    if (lastSelectedServerId && userServers.value.some(s => s.serverId === lastSelectedServerId)) {
      selectedServerId.value = lastSelectedServerId;
    }
  }
});
</script>