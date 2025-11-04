/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
          sans: ['Inter', 'sans-serif'],
      },
      colors: {
          'primary': 'var(--color-primary)',
          'primary-hover': 'var(--color-primary-hover)',
          'background': 'var(--color-background)',
          'surface': 'var(--color-surface)',
          'surface-accent': 'var(--color-surface-accent)',
          'text-primary': 'var(--color-text-primary)',
          'text-secondary': 'var(--color-text-secondary)',
          'positive': 'var(--color-positive)',
          'negative': 'var(--color-negative)',
          'warning': 'var(--color-warning)',
      },
      keyframes: {
          'fade-in': {
              '0%': { opacity: '0' },
              '100%': { opacity: '1' },
          },
          'fade-in-up': {
              '0%': { opacity: '0', transform: 'translateY(10px)' },
              '100%': { opacity: '1', transform: 'translateY(0)' },
          },
      },
      animation: {
          'fade-in': 'fade-in 0.5s ease-out',
          'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
      },
    }
  },
  plugins: [],
}
