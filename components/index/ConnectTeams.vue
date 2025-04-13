<template>
  <section class="w-full py-4 sm:py-86 bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 relative overflow-hidden border-t-4 border-b-4 border-purple-300" aria-labelledby="teams-heading">
    <div class="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-6 sm:gap-8 lg:gap-16 relative z-10">
      <div class="lg:w-1/2 order-1 mb-6 lg:mb-0">
        <div class="rounded-xl overflow-hidden shadow-lg bg-white p-2">
          <img src="/images/Logo.png" alt="Team collaboration interface" class="w-full max-w-md mx-auto" />
        </div>
      </div>
      <div class="lg:w-1/2 order-2 py-4">
        <h2 id="teams-heading" class="text-3xl sm:text-4xl font-bold mb-4 text-heading">
          <!-- Mobile heading - visible on screens below sm breakpoint -->
          <span class="block sm:hidden">Connect Teams</span>
          
          <!-- Desktop heading - visible on sm screens and up -->
          <span class="hidden sm:block">Bring Your Team Together!</span>
        </h2>
        <p class="text-lg mb-6 text-text">Bring your team together with text channels, group-chats, shared-planning and seamless file sharing. Keep conversations organized and searchable to improve team productivity.</p>
        <ul class="space-y-3 mb-6 sm:mb-8" aria-label="Team collaboration features">
          <li class="flex items-start">
            <fa :icon="['fas', 'comments']" class="text-accent-blue mt-1 mr-2 flex-shrink-0" aria-hidden="true" />
            <span>Real-time messaging and notifications</span>
          </li>
          <li class="flex items-start">
            <fa :icon="['fas', 'file-export']" class="text-accent-blue mt-1 mr-2 flex-shrink-0" aria-hidden="true" />
            <span>File sharing with version history</span>
          </li>
          <li class="flex items-start">
            <fa :icon="['fas', 'users-gear']" class="text-accent-blue mt-1 mr-2 flex-shrink-0" aria-hidden="true" />
            <span>Dynamic group roles and project designations</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>