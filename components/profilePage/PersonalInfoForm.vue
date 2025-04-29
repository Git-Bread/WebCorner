<template>
  <div class="bg-background shadow-lg rounded-lg p-6 mb-6 form-fade-in">
    <h3 class="font-medium text-xl text-heading mb-4 pb-2 border-b border-border">Personal Information</h3>
    
    <!-- Email section is always visible -->
    <div class="mb-3">
      <label class="block text-heading font-medium mb-2 text-sm">Email Address</label>
      <div class="relative">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center">
          <fa :icon="['fas', 'envelope']" class="text-theme-primary" />
        </span>
        <div class="bg-surface pl-10 p-3 rounded border border-border flex items-center">
          <span class="text-text">{{ user?.email || 'No email' }}</span>
          <span v-if="isEmailVerified" class="ml-auto bg-success bg-opacity-10 text-text text-xs px-2 py-1 rounded">Verified</span>
          <span v-else class="ml-auto bg-warning bg-opacity-10 text-text text-xs px-2 py-1 rounded">Not Verified</span>
        </div>
      </div>
      <div class="flex items-center justify-between">
        <p class="text-text-muted text-xs mt-1">Your email address is associated with your login.</p>
        <button v-if="!isEmailVerified" @click="resendVerificationEmail" class="text-link hover:text-link-hover text-xs mt-1 ml-4" :disabled="isResendingEmail">
          <span v-if="isResendingEmail" class="inline-block">
            <fa :icon="['fas', 'spinner']" class="mr-1 animate-spin" /> Sending...
          </span>
          <span v-else class="flex">
            <fa :icon="['fas', 'paper-plane']" class="mr-1" />
            <p class="hover:underline">Resend Verification</p>
          </span>
        </button>
      </div>
    </div>
    
    <!-- View Mode -->
    <div v-if="!isEditing" class="space-y-4">
      <!-- Display Username -->
      <div>
        <h4 class="text-heading font-medium mb-2 text-sm">Username</h4>
        <div class="bg-surface p-3 pt-2 pb-2 rounded border border-border">
          <div class="flex items-center">
            <fa :icon="['fas', 'user']" class="text-theme-primary mr-3" />
            <span class="text-text">{{ profileData.username || 'No username set' }}</span>
          </div>
        </div>
      </div>
      
      <!-- Display Bio -->
      <div>
        <h4 class="text-heading font-medium mb-2 text-sm">Bio</h4>
        <div class="bg-surface p-3 rounded border border-border">
          <div class="flex">
            <fa :icon="['fas', 'comment-alt']" class="text-theme-primary mr-3 mt-1 flex-shrink-0" />
            <p class="text-text whitespace-pre-line">{{ profileData.bio || 'No bio added yet' }}</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Edit Mode -->
    <form v-else @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Username with AuthFormField -->
      <AuthFormField id="username" name="username" type="text" label="Username" icon="user" 
        placeholder="Enter your username" v-model="profileData.username">
        <p class="text-text-muted text-xs mt-1">This is how you'll appear to other users.</p>
      </AuthFormField>
      
      <!-- Profile images selection -->
      <div>
        <label class="block text-heading font-medium mb-2 text-sm">Select Profile Image</label>
        <div class="grid grid-cols-4 sm:grid-cols-6 gap-3">
          <div v-for="image in profileImages" :key="image" @click="selectProfileImage(image)"
            class="w-16 h-16 rounded-full overflow-hidden border-2 cursor-pointer transition-all hover:scale-105"
            :class="profileData.profileImage === image ? 'border-theme-primary' : 'border-transparent'">
            <img :src="image" alt="Profile option" class="w-full h-full object-cover" />
          </div>
          <div class="w-16 h-16 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-theme-primary">
            <fa :icon="['fas', 'plus']" class="text-xl text-text-muted hover:text-theme-primary" />
          </div>
        </div>
      </div>
      
      <!-- Bio section -->
      <div>
        <label for="bio" class="block font-medium text-text mb-2">Bio</label>
        <div class="relative">
          <fa :icon="['fas', 'comment-alt']" class="absolute left-3 top-3 text-theme-primary z-20" aria-hidden="true" />
          <textarea id="bio" v-model="profileData.bio" rows="4" placeholder="Tell us a little about yourself..."
            class="pl-10 appearance-none rounded relative block w-full px-3 py-2 border bg-surface text-text focus:outline-none focus:z-10 border-border placeholder-text-muted dark:placeholder-opacity-70 focus:ring-theme-primary focus:border-theme-primary"></textarea>
        </div>
      </div>
      
      <!-- Save button -->
      <div class="flex justify-end pt-2">
        <button type="submit" class="bg-theme-primary text-background px-6 py-2 rounded hover:bg-theme-secondary transition duration-200 flex items-center" :disabled="isSaving">
          <span v-if="isSaving" class="mr-2 animate-spin"><fa :icon="['fas', 'spinner']" /></span>
          <fa v-else :icon="['fas', 'save']" class="mr-2" />
          {{ isSaving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">

// Get auth data and profile composable directly
const { user } = useAuth();
const { 
  profileData,
  profileImages, 
  isEditing,
  isSaving,
  isEmailVerified,
  isResendingEmail,
  saveProfile,
  selectProfileImage,
  resendVerificationEmail,
} = useProfile();

// Submit handler to directly save profile
function handleSubmit() {
  saveProfile();
}
</script>