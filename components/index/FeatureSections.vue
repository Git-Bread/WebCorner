<template>
  <div role="complementary" aria-label="Detailed Features" class="z-10"> 
    <!-- Create Servers Section -->
    <section class="w-full py-16 md:py-24 bg-gradient-to-br from-background to-blue-50" aria-labelledby="servers-heading">
      <div class="container mx-auto px-4 flex flex-col md:flex-row items-center gap-8 md:gap-16">
        <div class="md:w-1/2 order-2 md:order-1">
          <h2 id="servers-heading" class="text-3xl md:text-4xl font-bold mb-4 text-heading">Create Servers</h2>
          <p class="text-lg mb-6 text-text">Build custom communication servers for your team, department, or entire organization with just a few clicks. Organize discussions, plan events, schedule meetings, everything one convenient click away.</p>
          <ul class="space-y-3 mb-8" aria-label="Server features">
            <li class="flex items-start">
              <fa :icon="['fas', 'check']" class="text-accent-blue mt-1 mr-2" aria-hidden="true" />
              <span>Custom permissions and roles for team members</span>
            </li>
            <li class="flex items-start">
              <fa :icon="['fas', 'check']" class="text-accent-blue mt-1 mr-2" aria-hidden="true" />
              <span>Customisable servers to match your organisations needs</span>
            </li>
            <li class="flex items-start">
              <fa :icon="['fas', 'check']" class="text-accent-blue mt-1 mr-2" aria-hidden="true" />
              <span>A robust and secure system where everything is stored in the cloud</span>
            </li>
          </ul>
        </div>
        <div class="md:w-1/2 order-1 md:order-2 mb-8 md:mb-0">
          <img src="/images/Logo.png" alt="Server creation interface" class="w-full max-w-lg mx-auto" />
        </div>
      </div>
    </section>

    <!-- Connect Teams Section -->
    <section class="w-full py-16 md:py-24 bg-gradient-to-br from-background to-purple-50" aria-labelledby="teams-heading">
      <div class="container mx-auto px-4 flex flex-col md:flex-row items-center gap-8 md:gap-16">
        <div class="md:w-1/2 mb-8 md:mb-0">
          <img src="/images/Logo.png" alt="Team collaboration interface" class="w-full max-w-lg mx-auto" />
        </div>
        <div class="md:w-1/2">
          <h2 id="teams-heading" class="text-3xl md:text-4xl font-bold mb-4 text-heading">Connect Teams</h2>
          <p class="text-lg mb-6 text-text">Bring your team together with text channels, group-chats, shared-planning and seamless file sharing. Keep conversations organized and searchable to improve team productivity.</p>
          <ul class="space-y-3 mb-8" aria-label="Team collaboration features">
            <li class="flex items-start">
              <fa :icon="['fas', 'check']" class="text-accent-blue mt-1 mr-2" aria-hidden="true" />
              <span>Real-time messaging and notifications</span>
            </li>
            <li class="flex items-start">
              <fa :icon="['fas', 'check']" class="text-accent-blue mt-1 mr-2" aria-hidden="true" />
              <span>File sharing with version history</span>
            </li>
            <li class="flex items-start">
              <fa :icon="['fas', 'check']" class="text-accent-blue mt-1 mr-2" aria-hidden="true" />
              <span>Dynamic group roles and project designations</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Customize Workflow Section -->
    <section class="w-full py-16 md:py-24 bg-gradient-to-br from-background to-green-50" aria-labelledby="workflow-heading">
      <div class="container mx-auto px-4 flex flex-col md:flex-row items-center gap-8 md:gap-16">
        <div class="md:w-1/2 order-2 md:order-1">
          <h2 id="workflow-heading" class="text-3xl md:text-4xl font-bold mb-4 text-heading">Customize Workflow</h2>
          <p class="text-lg mb-6 text-text">Tailor your workspace with components, feeds, and customizable permissions for every team member. Create workflows that match your team's unique processes.</p>
          <ul class="space-y-3 mb-8" aria-label="Workflow customization features">
            <li class="flex items-start">
              <fa :icon="['fas', 'check']" class="text-accent-blue mt-1 mr-2" aria-hidden="true" />
              <span>Customize the page just for you</span>
            </li>
            <li class="flex items-start">
              <fa :icon="['fas', 'check']" class="text-accent-blue mt-1 mr-2" aria-hidden="true" />
              <span>Your schedules, your planning, your colors we prioritise your autonomy</span>
            </li>
            <li class="flex items-start">
              <fa :icon="['fas', 'check']" class="text-accent-blue mt-1 mr-2" aria-hidden="true" />
              <span>A unique overlay for every server</span>
            </li>
          </ul>
        </div>
        <div class="md:w-1/2 order-1 md:order-2 mb-8 md:mb-0">
          <img src="/images/Logo.png" alt="Workflow customization interface" class="w-full max-w-lg mx-auto" />
        </div>
      </div>
    </section>
  </div>
</template>