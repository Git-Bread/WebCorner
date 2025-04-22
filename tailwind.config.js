module.exports = {
    content: [
        "./components/**/*.{js,vue,ts}",
        "./layouts/**/*.vue",
        "./pages/**/*.vue",
        "./plugins/**/*.{js,ts}",
        "./nuxt.config.{js,ts}",
        "./app.vue",
        "./error.vue"
    ],
    theme: {
        extend: {
            colors: {
                // Text colors
                text: {
                    DEFAULT: 'var(--color-text)',
                    muted: 'var(--color-text-muted)'
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
                accent: {
                    1: 'var(--color-accent-1)',
                    2: 'var(--color-accent-2)'
                },
                
                // Theme colors
                theme: {
                    primary: 'var(--color-theme-primary)',
                    secondary: 'var(--color-theme-secondary)',
                    tertiary: 'var(--color-theme-tertiary)',
                    quaternary: 'var(--color-theme-quaternary)',
                    quinary: 'var(--color-theme-quinary)'
                },
                
                // Interactive element colors
                interactive: {
                    '1': {
                        active: 'var(--color-interactive-1-active)',
                        highlight: 'var(--color-interactive-1-highlight)'
                    },
                    '2': {
                        active: 'var(--color-interactive-2-active)',
                        highlight: 'var(--color-interactive-2-highlight)'
                    },
                    '3': {
                        active: 'var(--color-interactive-3-active)',
                        highlight: 'var(--color-interactive-3-highlight)'
                    }
                },
                
                // UI component colors
                ui: {
                    overlay: 'var(--color-ui-overlay)',
                    accent: 'var(--color-ui-accent)',
                    control: 'var(--color-ui-control)'
                }
            },
            backgroundImage: {
                'gradient-hero': 'var(--gradient-hero)',
                'gradient-1': 'var(--gradient-1)',
                'gradient-2': 'var(--gradient-2)',
                'gradient-3': 'var(--gradient-3)',
                'gradient-page': 'var(--gradient-page)',
                'gradient-section-1': 'var(--gradient-section-1)',
                'gradient-section-2': 'var(--gradient-section-2)',
                'gradient-section-3': 'var(--gradient-section-3)',
            }
        }
    },
    plugins: []
}