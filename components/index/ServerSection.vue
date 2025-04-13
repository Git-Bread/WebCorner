<template>
  <!-- Create Servers Section with enhanced background -->
  <section class="w-full py-4 sm:py-8 bg-gradient-to-br from-accent-blue-50 via-blue-100 to-accent-blue-200 relative overflow-hidden border-t-4 border-b-4 border-accent-blue-300" aria-labelledby="servers-heading">
    <div class="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-6 sm:gap-8 lg:gap-16 relative z-10">
      <div class="lg:w-1/2 order-2 lg:order-1 py-4">
        <h2 id="servers-heading" class="text-3xl sm:text-4xl font-bold mb-4 text-heading">
          <!-- Mobile heading - visible on screens below sm breakpoint -->
          <span class="block sm:hidden">Create Servers</span>
          
          <!-- Desktop heading - visible on sm screens and up -->
          <span class="hidden sm:block">The Communication Centres of Tomorrow!</span>
        </h2>
        <p class="text-lg mb-6 text-text">The most important aspect of teamwork is communication, and here at WebCorner we understand and try to embody this concept. Create your own town square or project forum where
          you and your team can communicate and collaborate in a modern controlled enviroment.</p>
        <ul class="space-y-3 mb-6 sm:mb-8" aria-label="Server features">
          <li class="flex items-start">
            <fa :icon="['fas', 'shield']" class="text-accent-blue mt-1 mr-2 flex-shrink-0" aria-hidden="true" />
            <span>A focus on security with rigorous authentication and permissions, no unwanted visitors allowed</span>
          </li>
          <li class="flex items-start">
            <fa :icon="['fas', 'server']" class="text-accent-blue mt-1 mr-2 flex-shrink-0" aria-hidden="true" />
            <span>Customisable servers to match your organisation or groups needs </span>
          </li>
          <li class="flex items-start">
            <fa :icon="['fas', 'cloud']" class="text-accent-blue mt-1 mr-2 flex-shrink-0" aria-hidden="true" />
            <span>A robust and secure system where everything is stored in the cloud</span>
          </li>
        </ul>
      </div>
      <div class="lg:w-1/2 order-1 lg:order-2 lg:mb-0">
        <div class="rounded-xl overflow-hidden shadow-lg bg-white p-2">
          <img src="/images/Logo.png" alt="Server creation interface" class="w-full max-w-md mx-auto" />
        </div>
      </div>
    </div>
  </section>
</template>