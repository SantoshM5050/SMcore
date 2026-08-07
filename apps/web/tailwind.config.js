/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090a0f',
        foreground: '#f3f4f6',
        card: {
          DEFAULT: '#11131c',
          foreground: '#f3f4f6',
        },
        popover: {
          DEFAULT: '#161925',
          foreground: '#f3f4f6',
        },
        primary: {
          DEFAULT: '#5865F2',
          hover: '#4752C4',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#1e2230',
          foreground: '#9ca3af',
        },
        muted: {
          DEFAULT: '#1a1d2b',
          foreground: '#6b7280',
        },
        accent: {
          DEFAULT: '#262a3d',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: '#ed4245',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#57f287',
          foreground: '#000000',
        },
        warning: {
          DEFAULT: '#fee75c',
          foreground: '#000000',
        },
        border: '#232738',
        input: '#1a1d2b',
        ring: '#5865F2',
      },
      borderRadius: {
        lg: '0.625rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
    },
  },
  plugins: [],
};
