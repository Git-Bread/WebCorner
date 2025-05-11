export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss', '@vesp/nuxt-fontawesome'],

  // fontawesome configuration
  fontawesome: {
    component: 'fa',
    icons: {
      solid: [
        // UI and navigation
        'arrow-left',
        'arrow-right',
        'calendar',
        'check',
        'check-circle',
        'chevron-down',
        'chevron-up',
        'circle-exclamation',
        'circle-notch',
        'cog',
        'comments',
        'envelope',
        'file-export',
        'globe',
        'info-circle',
        'key',
        'laptop-code',
        'lock',
        'moon',
        'palette',
        'pen',
        'right-to-bracket',
        'rocket',
        'satellite',
        'save',
        'server',
        'shield',
        'shield-alt',
        'sliders',
        'spinner',
        'sun',
        'times',
        'trash-alt',
        'user',
        'users',
        'users-gear',
        'user-plus',
        'cloud',
        'paper-plane',
        'comment-alt',
        'plus',
        'universal-access',
        'exclamation-triangle',
        'crown',
        'copy',
        'newspaper',
        'plus-circle',
        'edit',
        'comment-dots',
        'chart-bar',
        'chevron-right',
        'chevron-left',
        'trash',
        'compress-alt',
        'tools',
        'paint-brush',
        'hashtag',
        'comment',
        'sync',
      ],
      brands: [
        'github',
        'twitter'
      ]
    }
  },
  css: [
    '@/assets/css/colors.css',
    '@/assets/css/animations.css',
    '@/assets/css/font-size.css',
    '@/assets/css/icon-size.css',
    '@/assets/css/accessibility.css',
    '@/assets/css/high-contrast.css',
  ],
  tailwindcss: {
    exposeConfig: false,
    viewer: true,
  },
  // Disable server-side rendering for specific routes
  // This is useful and standard for routes that are purely client-side, like authentication pages
  // since the transitions and authentication shenanigans generate alot of hydration errors and its not needed for SEO
  routeRules: {
    '/login': { ssr: false },
    '/register': { ssr: false },
    '/forgot-password': { ssr: false },
    '/profile': { ssr: false },
  },

  // Add Firebase configuration
  runtimeConfig: {
    public: {
      // Add isDevelopment flag for client-side use
      isDevelopment: process.env.NODE_ENV !== 'production',
      firebaseConfig: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID,
      }
    }
  },
})