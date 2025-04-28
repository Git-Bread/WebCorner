<template>
  <header class="shadow-md z-10 bg-background">
    <div class="mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">

        <!-- Site Title on the left, diffrent link if logged in -->
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
    
        <!-- Empty space in the middle -->
        <div class="flex-grow"></div>
    
        <!-- Profile section with user info -->
        <div class="flex items-center">
          <!-- User name display with client-only to prevent hydration mismatch -->
          <ClientOnly>
            <span class="text-text">{{ userName }}</span>
          </ClientOnly>
          
          <!-- Profile menu dropdown -->
          <div class="ml-3 relative">
            <div>
              <button @click="toggleMenu" type="button" class="flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-link rounded-full" aria-expanded="false">
                <!-- Use user's photoURL if available, otherwise default image -->
                <picture class="h-10 w-10 rounded-full overflow-hidden transition-transform border-2 hover:border-accent-1">
                  <ClientOnly>
                    <img :src="userPhotoUrl" :alt="`${userName}'s profile`" class="h-full w-full object-cover"/>
                  </ClientOnly>
                </picture>
              </button>
            </div>
            
            <!-- Profile dropdown menu -->
            <div v-if="menuOpen" class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-surface"
            role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" @blur="closeMenu">
              <div class="py-1" role="none">
                <NuxtLink to="/profile" class="block px-4 py-2 text-sm text-text hover:bg-background transition-colors" role="menuitem">
                  Your Profile
                </NuxtLink>
                <button @click="toggleSettingsPanel" class="w-full text-left block px-4 py-2 text-sm text-text hover:bg-background transition-colors" role="menuitem">
                  Settings
                </button>
                <button @click="handleLogout" class="w-full text-left block px-4 py-2 text-sm text-text hover:bg-background transition-colors" role="menuitem">
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Settings Panel -->
  <SettingsMenu v-if="settingsOpen" mode="user" @close-settings="closeSettingsPanel" />
</template>

<script setup lang="ts">
import { ClientOnly } from '#components';
import { doc, getDoc } from 'firebase/firestore'
import SettingsMenu from '~/components/userComponents/SettingsMenu.vue';
import { ref, computed, onMounted, onUnmounted } from 'vue';

interface UserDocument {
  username: string;
  email: string;
  profile_image_url?: string;
}

const { user, logout, isAuthenticated } = useAuth()
const menuOpen = ref(false)
const userDoc = ref<UserDocument | null>(null)

// Local state for Settings panel visibility
const settingsOpen = ref(false);

onMounted(async () => {
  if (user.value) {
    const { firestore } = useFirebase()
    try {
      const docRef = doc(firestore, 'users', user.value.uid)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        userDoc.value = docSnap.data() as UserDocument
      }
    } catch (error) {
      console.error('Error fetching user document:', error)
    }
  }
})

// Get user name from username in Firestore or fallback to email/uid
const userName = computed(() => {
  if (userDoc.value?.username) {
    return userDoc.value.username
  }
  return user.value?.email?.split('@')[0] || 'User'
})

// Get user photo URL from Firestore or fallback to default
const userPhotoUrl = computed(() => {
  if (userDoc.value?.profile_image_url) {
    return userDoc.value.profile_image_url
  }
  return '/images/Profile_Pictures/default_profile.jpg'
})

// Menu toggle
const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const closeMenu = () => {
  menuOpen.value = false
}

// Settings Panel toggle function
const toggleSettingsPanel = () => {
  settingsOpen.value = !settingsOpen.value;
  menuOpen.value = false; // Close menu when toggling panel
}

// Settings Panel close function
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

// Close menu when clicking outside & handle Escape key
onMounted(() => {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    // Close menu if click is outside the relative container of the dropdown
    if (!target.closest('.ml-3.relative')) { 
      menuOpen.value = false
    }
  })
  
  // Close panels with escape key
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
