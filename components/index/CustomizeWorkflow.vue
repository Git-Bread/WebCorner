<template>
  <div class="w-full py-4 sm:py-8 bg-gradient-section-2 relative overflow-hidden border-t-4 border-b-4 border-shade-2-300" aria-labelledby="workflow-heading">
    <div class="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-6 sm:gap-8 lg:gap-16 relative z-10">
      <div class="lg:w-1/2 order-2 mb-6 lg:mb-0">
        <img src="/images/REPLACE.png" alt="REPLACE" class="w-full h-full object-cover rounded-2xl" />
      </div>
      <div class="lg:w-1/2 order-1 lg:order-2 py-4">
        <div id="workflow-heading" class="font-bold mb-4 text-heading">
          <!-- Mobile heading - visible on screens below sm breakpoint -->
          <h2 class="block sm:hidden">Customize Workflow</h2>
          
          <!-- Desktop heading - visible on sm screens and up -->
          <h2 class="hidden sm:block">Your Workflow, Your Rules!</h2>
        </div>
        <p class="mb-6 text-text">Tailor your workspace with components, feeds, and customizable permissions for every team member. Create workflows that match your team's unique processes.</p>
        <ul class="space-y-3 mb-6 sm:mb-8 feature-list" aria-label="Workflow customization features">
          <li class="flex items-center">
            <fa :icon="['fas', 'sliders']" class="text-theme-primary mr-3 flex-shrink-0 icon-md" aria-hidden="true" />
            <span>Customize the page just for you</span>
          </li>
          <li class="flex items-center">
            <fa :icon="['fas', 'calendar']" class="text-theme-primary mr-3 flex-shrink-0 icon-md" aria-hidden="true" />
            <span>Your schedules, your planning, your workspace</span>
          </li>
          <li class="flex items-center">
            <fa :icon="['fas', 'palette']" class="text-theme-primary mr-3 flex-shrink-0 icon-md" aria-hidden="true" />
            <span>A unique overlay for every server</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>