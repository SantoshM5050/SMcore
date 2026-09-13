/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Stitch Precision Dark Canvas & Surfaces
        background: '#090a0f',
        'on-background': '#e3e1e9',
        surface: '#0d0f17',
        'surface-canvas': '#090a0f',
        'surface-dim': '#090a0f',
        'surface-bright': '#38393f',
        'surface-container-lowest': '#090a0f',
        'surface-container-low': '#0d0f17',
        'surface-container': '#131622',
        'surface-container-high': '#1b1f30',
        'surface-container-highest': '#262b40',
        'surface-variant': '#1b1f30',
        'on-surface': '#e3e1e9',
        'on-surface-variant': '#c7c4d7',
        'inverse-surface': '#e3e1e9',
        'inverse-on-surface': '#2f3036',

        // Borders
        outline: '#908fa0',
        'outline-variant': '#1e2235',
        'border-subtle': '#1e2235',
        'border-medium': '#262b40',
        'border-active': '#313754',

        // Stitch Primary (Indigo Ray)
        primary: {
          DEFAULT: '#6366f1',
          foreground: '#ffffff',
          container: '#8083ff',
          light: '#c0c1ff',
        },
        'on-primary': '#ffffff',
        'primary-container': '#8083ff',
        'on-primary-container': '#0d0096',
        'inverse-primary': '#494bd6',
        'primary-fixed': '#e1e0ff',
        'primary-fixed-dim': '#c0c1ff',

        // Secondary (Electric Violet)
        secondary: {
          DEFAULT: '#818cf8',
          foreground: '#131e8c',
          container: '#2f3aa3',
        },
        'on-secondary': '#131e8c',
        'secondary-container': '#2f3aa3',
        'on-secondary-container': '#a8afff',
        'secondary-fixed': '#e0e0ff',
        'secondary-fixed-dim': '#bdc2ff',

        // Tertiary / Success (Emerald Sentinel)
        tertiary: {
          DEFAULT: '#10b981',
          foreground: '#003824',
          container: '#00885d',
        },
        'on-tertiary': '#003824',
        'tertiary-container': '#00885d',
        'on-tertiary-container': '#000703',
        'tertiary-fixed': '#6ffbbe',
        'tertiary-fixed-dim': '#4edea3',

        // Error / Danger (Rose Purge)
        error: {
          DEFAULT: '#f43f5e',
          foreground: '#ffffff',
          container: '#93000a',
        },
        'on-error': '#ffffff',
        'error-container': '#93000a',
        'on-error-container': '#ffdad6',

        // Warning (Amber Sentry)
        warning: {
          DEFAULT: '#f59e0b',
          foreground: '#000000',
          container: '#78350f',
        },

        // Compatibility tokens
        text: {
          primary: '#e3e1e9',
          secondary: '#c7c4d7',
          muted: '#908fa0',
        },
        status: {
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#f43f5e',
          info: '#6366f1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        sm: '0.125rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.6), 0 2px 4px -2px rgba(0, 0, 0, 0.6)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.7), 0 4px 6px -4px rgba(0, 0, 0, 0.7)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 8px 10px -6px rgba(0, 0, 0, 0.8)',
        glow: '0 0 16px -2px rgba(99, 102, 241, 0.35)',
        'glow-tertiary': '0 0 16px -2px rgba(16, 185, 129, 0.35)',
        'glow-error': '0 0 16px -2px rgba(244, 63, 94, 0.35)',
      },
    },
  },
  plugins: [],
};
