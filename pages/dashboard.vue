<template>
  <div class="flex h-screen bg-background">
    <!-- Server Sidebar Component -->
    <ServerSidebar 
      :servers="serverActions.userServers.value" 
      :server-data="serverActions.serverData.value" 
      :is-loading="serverActions.isLoading.value" 
      :selected-server-id="selectedServerId"
      @server-selected="handleServerSelection"
      @add-server="showCreateServerDialog = true"
    />
    
    <!-- Main content area -->
    <div class="flex-1 p-8 overflow-auto">
      <h1 class="font-bold text-3xl text-heading mb-6">Dashboard</h1>
      
      <!-- No servers message -->
      <NoServersMessage 
        v-if="!serverActions.isLoading.value && (!hasServers)"
        @create-server="showCreateServerDialog = true"
        @join-server="showJoinServerDialog = true"
      />
      
      <!-- Server content will go here when user is connected to servers -->
      <DashboardContent 
        v-else-if="hasServers" 
        :selected-server-id="selectedServerId"
        :server-data="serverActions.serverData.value"
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
    :is-creating="serverActions.isCreatingServer.value"
    @close="showCreateServerDialog = false"
    @create="handleCreateServer"
  />
  
  <!-- Join Server Dialog -->
  <JoinServerDialog 
    :is-open="showJoinServerDialog"
    :is-joining="serverActions.isJoiningServer.value"
    @close="showJoinServerDialog = false"
    @join="handleJoinServer"
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

// Define page meta with authenticated layout
definePageMeta({ layout: 'default-authed' });

// Use the server actions composable
const serverActions = useServerActions();
const selectedServerId = ref<string | null>(null);

// Computed property to check if user has servers
const hasServers = computed(() => {
  return serverActions.userServers.value && serverActions.userServers.value.length > 0;
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
  const result = await serverActions.createServer(serverInfo);
  
  if (result) {
    // Show success toast notification
    import('~/utils/toast').then(({ showToast }) => {
      showToast(`Server "${serverInfo.name}" created successfully!`, 'success', 3000);
    });
    
    // Close the dialog
    showCreateServerDialog.value = false;
    
    // Wait briefly for server data to be updated, then select the new server
    setTimeout(async () => {
      // Refresh server list to ensure we have the latest data
      await serverActions.loadUserServers();
      
      // Find and select the newly created server using server data
      const newServerData = serverActions.serverData.value[serverInfo.name];
      if (newServerData) {
        const newServer = serverActions.userServers.value.find(s => s.serverId === newServerData.serverId);
        if (newServer) {
          selectedServerId.value = newServer.serverId;
        }
      }
    }, 500);
  }
};

// Handle joining a server
const handleJoinServer = async (serverId: string) => {
  const success = await serverActions.joinServer(serverId);
  if (success) {
    showJoinServerDialog.value = false;
  }
};

// Load user's servers on component mount
onMounted(async () => {
  await serverActions.loadUserServers();
});
</script>