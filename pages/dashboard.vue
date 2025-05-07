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
    />
    
    <!-- Main content area -->
    <div class="flex-1 p-8 overflow-auto">
      <h1 class="font-bold text-3xl text-heading mb-6">Dashboard</h1>
      
      <!-- No servers message -->
      <NoServersMessage 
        v-if="!isLoading && (!hasServers)"
        @create-server="showCreateServerDialog = true"
        @join-server="showJoinServerDialog = true"
      />
      
      <!-- Server content will go here when user is connected to servers -->
      <DashboardContent 
        v-else-if="hasServers" 
        :selected-server-id="selectedServerId"
        :server-data="serverData"
      />
      
      <!-- Loading state -->
      <LoadingIndicator 
        v-else 
        message="Loading your servers..." 
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
import { ref, onMounted, computed } from 'vue';

// Import components
import ServerSidebar from '~/components/dashboard/ServerSidebar.vue';
import NoServersMessage from '~/components/dashboard/NoServersMessage.vue';
import DashboardContent from '~/components/dashboard/DashboardContent.vue';
import LoadingIndicator from '~/components/dashboard/LoadingIndicator.vue';
import CreateServerDialog from '~/components/dashboard/CreateServerDialog.vue';
import JoinServerDialog from '~/components/dashboard/JoinServerDialog.vue';
// Import specific server composables instead of the combined useServerActions
import { useServerCore, useServerJoining, useServerInvitations } from '~/composables/server';

// Define page meta with authenticated layout
definePageMeta({ layout: 'default-authed' });

// Use the specific server composables
const { userServers, serverData, isLoading, isCreatingServer, loadUserServers, createServer } = useServerCore();
const { isJoiningServer, joinServer } = useServerJoining();
const { joinServerWithInvite } = useServerInvitations();

const selectedServerId = ref<string | null>(null);

// Computed property to check if user has servers
const hasServers = computed(() => {
  return userServers.value && userServers.value.length > 0;
});

// Dialog states
const showCreateServerDialog = ref(false);
const showJoinServerDialog = ref(false);

// Handle server selection
const handleServerSelection = (serverId: string | null) => {
  selectedServerId.value = serverId;
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
        selectedServerId.value = newServer.serverId;
      }
    }, 500); // Keep a small delay to allow reactivity to settle
  }
};

// Handle joining a server directly with server ID
const handleJoinServer = async (serverId: string) => {
  const success = await joinServer(serverId);
  if (success) {
    showJoinServerDialog.value = false;
  }
};

// Handle joining a server with an invitation code
const handleJoinWithInvite = async (inviteCode: string) => {
  const success = await joinServerWithInvite(inviteCode);
  if (success) {
    showJoinServerDialog.value = false;
  }
};

// Load user's servers on component mount
onMounted(async () => {
  await loadUserServers();
});
</script>