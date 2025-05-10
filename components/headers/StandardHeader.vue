<template>
  <header class="shadow-md z-10 bg-background">
    <div class="mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <ClientOnly>
          <div class="flex items-center">
            <NuxtLink v-if="!isAuthenticated" to="/" class="flex items-center">
              <img src="/images/logo.png" alt="WebCorner Logo" class="h-10 w-10 mr-2" />
              <h1 class="font-bold text-heading">WebCorner</h1>
            </NuxtLink>
            <NuxtLink v-else to="/dashboard" class="flex items-center">
              <img src="/images/logo.png" alt="WebCorner Logo" class="h-10 w-10 mr-2" />
              <h1 class="font-bold text-heading">WebCorner</h1>
            </NuxtLink>
          </div>
        </ClientOnly>
    
        <div class="flex-grow"></div>
    
        <div class="flex items-center">
          <ClientOnly>
            <span class="text-text">{{ userName }}</span>
          </ClientOnly>
          
          <div class="ml-3 relative">
            <div>
              <button @click="toggleMenu" type="button" class="flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-link rounded-full" aria-expanded="false">
                <picture class="h-10 w-10 rounded-full overflow-hidden transition-transform border-2 border-border hover:border-accent-1">
                  <ClientOnly>
                    <img :src="isEditing && tempProfileImage ? tempProfileImage : userPhotoUrl" :alt="`${userName}'s profile`" class="h-full w-full object-cover"/>
                  </ClientOnly>
                </picture>
              </button>
            </div>
            
            <div v-if="menuOpen" class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-surface dark:bg-surface border border-border" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" @blur="closeMenu">
              <div class="py-1" role="none">
                <NuxtLink :to="isOnProfilePage ? '/dashboard' : '/profile'" class="block px-4 py-2 text-sm text-text hover:bg-background dark:hover:bg-background transition-colors" role="menuitem">
                  {{ isOnProfilePage ? 'Back to Dashboard' : 'Your Profile' }}
                </NuxtLink>
                <button @click="toggleSettingsPanel" class="w-full text-left block px-4 py-2 text-sm text-text hover:bg-background dark:hover:bg-background transition-colors" role="menuitem">
                  Settings
                </button>
                <button @click="handleLogout" class="w-full text-left block px-4 py-2 text-sm text-text hover:bg-background dark:hover:bg-background transition-colors" role="menuitem">
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <SettingsMenu v-if="settingsOpen" mode="user" @close-settings="closeSettingsPanel" />
</template>

<script setup lang="ts">
import { ClientOnly } from '#components';
import SettingsMenu from '~/components/userComponents/SettingsMenu.vue';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';

const { user, logout, isAuthenticated } = useAuth()
const profileState = useProfile()
const menuOpen = ref(false)

const settingsOpen = ref(false);

const userName = computed(() => profileState.userName.value)
const userPhotoUrl = computed(() => profileState.userPhotoUrl.value)
const isEditing = computed(() => profileState.isEditing.value)
const tempProfileImage = computed(() => profileState.tempProfileImage.value)

const route = useRoute();
const isOnProfilePage = computed(() => route.path === '/profile');

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const closeMenu = () => {
  menuOpen.value = false
}

const toggleSettingsPanel = () => {
  settingsOpen.value = !settingsOpen.value;
  menuOpen.value = false;
}

const closeSettingsPanel = () => {
  settingsOpen.value = false;
}

const handleLogout = async () => {
  const result = await logout()
  if (result.success) {
    menuOpen.value = false
  }
  navigateTo('/login');
}

onMounted(() => {
  if (user.value) {
    profileState.loadUserData()
  }

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    if (!target.closest('.ml-3.relative')) { 
      menuOpen.value = false
    }
  })
  
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (settingsOpen.value) {
        closeSettingsPanel();
      }
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('click', () => {})
  document.removeEventListener('keydown', () => {})
})
</script>
