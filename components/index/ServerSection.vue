<template>
  <!-- Create Servers Section with enhanced background -->
  <div class="w-full py-4 sm:py-8 bg-gradient-to-br from-accent-blue-50 via-blue-100 to-accent-blue-200 relative overflow-hidden border-t-4 border-b-4 border-accent-blue-300" aria-labelledby="servers-heading">
    <div class="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-6 sm:gap-8 lg:gap-16 relative z-10">
      <div class="lg:w-1/2 order-2 lg:order-1 py-4">
        <div id="servers-heading" class="font-bold mb-4 text-heading">
          <!-- Mobile heading - visible on screens below sm breakpoint -->
          <h2 class="block sm:hidden">Create Servers</h2>
          
          <!-- Desktop heading - visible on sm screens and up -->
          <h2 class="hidden sm:block">The Communication Centres of Tomorrow!</h2>
        </div>
        <p class="mb-6 text-text">The most important aspect of teamwork is communication, and here at WebCorner we understand and try to embody this concept. Create your own town square or project forum where
          you and your team can communicate and collaborate in a modern controlled enviroment.</p>
        <ul class="space-y-3 mb-6 sm:mb-8" aria-label="Server features">
          <li class="flex items-center">
            <fa :icon="['fas', 'shield']" class="text-accent-blue mr-3 flex-shrink-0 icon-md" aria-hidden="true" />
            <span class="mb-0.5">A focus on security with rigorous authentication and permissions, no unwanted visitors allowed</span>
          </li>
          <li class="flex items-center">
            <fa :icon="['fas', 'server']" class="text-accent-blue mr-3 flex-shrink-0 icon-md" aria-hidden="true" />
            <span class="mb-0.5">Customisable servers to match your organisation or groups needs </span>
          </li>
          <li class="flex items-center">
            <fa :icon="['fas', 'cloud']" class="text-accent-blue mr-3 flex-shrink-0 icon-md" aria-hidden="true" />
            <span class="mb-0.5">A robust and secure system where everything is stored in the cloud</span>
          </li>
        </ul>
      </div>
      <div class="lg:w-1/2 order-2 mb-6 lg:mb-0">
        <img src="/images/REPLACE.png" alt="REPLACE" class="w-full h-full object-cover rounded-2xl" />
      </div>
    </div>
  </div>
</template>