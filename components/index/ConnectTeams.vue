<template>
  <div class="w-full py-4 sm:py-8 bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 relative overflow-hidden border-t-4 border-b-4 border-purple-300" aria-labelledby="teams-heading">
    <div class="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-6 sm:gap-8 lg:gap-16 relative z-10">
      <div class="lg:w-1/2 order-2 lg:order-1 py-4">
        <div id="teams-heading" class="font-bold mb-4 text-heading">
          <!-- Mobile heading - visible on screens below sm breakpoint -->
          <h2 class="block sm:hidden">Connect Teams</h2>
          
          <!-- Desktop heading - visible on sm screens and up -->
          <h2 class="hidden sm:block">Bring Your Team Together!</h2>
        </div>
        <p class="mb-6 text-text">Bring your team together with text channels, group-chats, shared-planning and seamless file sharing. Keep conversations organized and searchable to improve team productivity.</p>
        <ul class="space-y-3 mb-6 sm:mb-8 feature-list" aria-label="Team collaboration features">
          <li class="flex items-center">
            <fa :icon="['fas', 'comments']" class="text-accent-blue mr-3 flex-shrink-0 icon-md" aria-hidden="true" />
            <span>Real-time messaging and notifications</span>
          </li>
          <li class="flex items-center">
            <fa :icon="['fas', 'file-export']" class="text-accent-blue mr-3 flex-shrink-0 icon-md" aria-hidden="true" />
            <span>File sharing with version history</span>
          </li>
          <li class="flex items-center">
            <fa :icon="['fas', 'users-gear']" class="text-accent-blue mr-3 flex-shrink-0 icon-md" aria-hidden="true" />
            <span>Dynamic group roles and project designations</span>
          </li>
        </ul>
      </div>
      <div class="lg:w-1/2 order-1 lg:order-2 mb-6 lg:mb-0">
        <img src="/images/REPLACE.png" alt="REPLACE" class="w-full h-full object-cover rounded-2xl" />
      </div>
    </div>
  </div>
</template>