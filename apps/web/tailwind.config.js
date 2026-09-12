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
        primary: {
          DEFAULT: '#c0c1ff',
          foreground: '#1e1f25',
          container: '#41427b',
        },
        background: '#121318',
        surface: {
          DEFAULT: '#1e1f25',
          container: '#292a2f',
          high: '#34343a',
          highest: '#3f4046',
        },
        text: {
          primary: '#e3e2e8',
          secondary: '#c5c5d3',
          muted: '#8e8ea0',
        },
        outline: {
          DEFAULT: '#46464f',
          variant: '#2d2e34',
        },
        status: {
          success: '#34d399',
          warning: '#fbbf24',
          danger: '#f87171',
          info: '#60a5fa',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '4px',
      },
    },
  },
  plugins: [],
};
