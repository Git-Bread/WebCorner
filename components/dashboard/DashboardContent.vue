<template>
  <div>
    <!-- Main Content Area -->
    <div class="bg-surface border border-border rounded-lg p-6">
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
</template>

<script setup lang="ts">
// Accept server data as props from the parent component
const props = defineProps<{
  serverData: Record<string, any>;
}>();
</script>