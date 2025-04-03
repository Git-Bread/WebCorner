module.exports = {
    content: [
        "./components/**/*.{js,vue,ts}",
        "./layouts/**/*.vue",
        "./pages/**/*.vue",
        "./plugins/**/*.{js,ts}",
        "./nuxt.config.{js,ts}",
        "./app.vue"
    ],
    theme: {
        extend: {
            colors: {
                // Text colors
                text: {
                    DEFAULT: 'var(--color-text)',
                    light: 'var(--color-text-light)'
                },
                heading: 'var(--color-heading)',
                link: {
                    DEFAULT: 'var(--color-link)',
                    hover: 'var(--color-link-hover)'
                },
                
                // Background colors
                background: 'var(--color-background)',
                surface: 'var(--color-surface)',
                border: 'var(--color-border)',
                
                // Action colors
                primary: 'var(--color-primary)',
                secondary: {
                    DEFAULT: 'var(--color-secondary)',
                    dark: 'var(--color-secondary-dark)'
                },
                
                // Status colors
                success: 'var(--color-success)',
                warning: 'var(--color-warning)',
                error: {
                    DEFAULT: 'var(--color-error)',
                    light: 'var(--color-error-light)'
                },
                info: 'var(--color-info)',
                
                // Decorative colors
                decoration: {
                    1: 'var(--color-decoration-1)',
                    2: 'var(--color-decoration-2)'
                },
                
                // Accent colors
                accent: {
                    blue: 'var(--color-blue)',
                    indigo: 'var(--color-indigo)',
                    green: 'var(--color-green)',
                    pink: 'var(--color-pink)',
                    purple: 'var(--color-purple)'
                }
            },
            backgroundImage: {
                'gradient-heading': 'var(--gradient-heading)',
                'gradient-background': 'var(--gradient-background)',
                'gradient-shape-1': 'var(--gradient-shape-1)',
                'gradient-shape-2': 'var(--gradient-shape-2)',
                'gradient-shape-3': 'var(--gradient-shape-3)'
            }
        }
    },
    plugins: []
}