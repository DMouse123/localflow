/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom colors for our app
        canvas: {
          light: '#f8fafc',
          dark: '#0f172a',
        },
        node: {
          bg: '#ffffff',
          border: '#e2e8f0',
          selected: '#3b82f6',
        }
      },
    },
  },
  plugins: [],
}
