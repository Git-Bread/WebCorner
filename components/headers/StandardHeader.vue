<template>
  <header class="shadow-md z-10 bg-background">
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
    
        <!-- Profile section with user info -->
        <div class="flex items-center">
          <!-- User name display with client-only to prevent hydration mismatch -->
          <client-only>
            <span class="text-text">{{ userName }}</span>
          </client-only>
          
          <!-- Profile menu dropdown -->
          <div class="ml-3 relative">
            <div>
              <button @click="toggleMenu" type="button" class="flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-link rounded-full" aria-expanded="false">
                <!-- Use user's photoURL if available, otherwise default image -->
                <picture class="h-10 w-10 rounded-full overflow-hidden transition-transform border-2 hover:border-decoration-1">
                  <client-only>
                    <img :src="userPhotoUrl" :alt="`${userName}'s profile`" class="h-full w-full object-cover"/>
                  </client-only>
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
                <NuxtLink to="/settings" class="block px-4 py-2 text-sm text-text hover:bg-background transition-colors" role="menuitem">
                  Settings
                </NuxtLink>
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
</template>

<script setup lang="ts">
import { doc, getDoc } from 'firebase/firestore'

interface UserDocument {
  username: string;
  email: string;
  profile_image_url?: string;
}

const { user, logout } = useAuth()
const menuOpen = ref(false)
const userDoc = ref<UserDocument | null>(null)

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

// Rest of your code remains unchanged
const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const closeMenu = () => {
  menuOpen.value = false
}

const handleLogout = async () => {
  const result = await logout()
  if (result.success) {
    menuOpen.value = false
  }
  navigateTo('/login');
}

// Close menu when clicking outside
onMounted(() => {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    if (!target.closest('.relative')) {
      menuOpen.value = false
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('click', () => {})
})
</script>
