/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#7c3aed',
        accent: '#a855f7',
        secondary: '#38bdf8',
        success: '#10B981',
        surface: '#06051a',
        'surface-light': '#120e3a',
        'glass-border': 'rgba(255,255,255,.11)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
