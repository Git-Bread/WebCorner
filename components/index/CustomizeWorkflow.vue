<template>
  <section class="w-full py-4 sm:py-8 bg-gradient-to-br from-green-50 via-green-100 to-green-200 relative overflow-hidden border-t-4 border-b-4 border-green-300" aria-labelledby="workflow-heading">
    <div class="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-6 sm:gap-8 lg:gap-16 relative z-10">
      <div class="lg:w-1/2 order-2 lg:order-1 py-4">
        <h2 id="workflow-heading" class="text-3xl sm:text-4xl font-bold mb-4 text-heading">
          <!-- Mobile heading - visible on screens below sm breakpoint -->
          <span class="block sm:hidden">Customize Workflow</span>
          
          <!-- Desktop heading - visible on sm screens and up -->
          <span class="hidden sm:block">Your Workflow, Your Rules!</span>
        </h2>
        <p class="text-lg mb-6 text-text">Tailor your workspace with components, feeds, and customizable permissions for every team member. Create workflows that match your team's unique processes.</p>
        <ul class="space-y-3 mb-6 sm:mb-8" aria-label="Workflow customization features">
          <li class="flex items-start">
            <fa :icon="['fas', 'sliders']" class="text-accent-blue mt-1 mr-2 flex-shrink-0" aria-hidden="true" />
            <span>Customize the page just for you</span>
          </li>
          <li class="flex items-start">
            <fa :icon="['fas', 'calendar']" class="text-accent-blue mt-1 mr-2 flex-shrink-0" aria-hidden="true" />
            <span>Your schedules, your planning, your workspace</span>
          </li>
          <li class="flex items-start">
            <fa :icon="['fas', 'palette']" class="text-accent-blue mt-1 mr-2 flex-shrink-0" aria-hidden="true" />
            <span>A unique overlay for every server</span>
          </li>
        </ul>
      </div>
      <div class="lg:w-1/2 order-1 lg:order-2 lg:mb-0">
        <div class="rounded-xl overflow-hidden shadow-lg bg-white p-2">
          <img src="/images/Logo.png" alt="Workflow customization interface" class="w-full max-w-md mx-auto" />
        </div>
      </div>
    </div>
  </section>
</template>