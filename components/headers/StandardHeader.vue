<template>
    <header class="shadow-md bg-background">
      <div class="mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Site Title on the left -->
          <div class="flex items-center">
            <NuxtLink to="/" class="flex items-center">
              <img src="/images/logo.png" alt="WebCorner Logo" class="h-10 w-10 mr-2" />
              <h1 class="text-3xl font-bold text-heading">WebCorner</h1>
            </NuxtLink>
          </div>
      
          <!-- Empty space in the middle -->
          <div class="flex-grow"></div>
      
          <!-- Profile icon on the right -->
          <div class="flex items-center">
            <div class="ml-3 relative">
              <button type="button" class="flex items-center focus:outline-none">
                <picture class="h-10 w-10 rounded-full overflow-hidden">
                    <source srcset="/images/default_profile.webp" type="image/webp" class="h-full w-full object-cover"/>
                    <img src="/images/default_profile.jpg" alt="Profile Picture" class="h-full w-full object-cover"/>
                </picture>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  </template>