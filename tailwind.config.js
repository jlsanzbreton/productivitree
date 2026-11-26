/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './constants.ts',
    './components/**/*.{ts,tsx,js}',
    './contexts/**/*.{ts,tsx,js}',
    './utils/**/*.{ts,tsx,js}',
    './services/**/*.{ts,tsx,js}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
