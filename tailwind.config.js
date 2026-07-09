/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        foreground: '#fafafa',
        card: '#121212',
        border: 'rgba(255, 255, 255, 0.1)',
        primary: '#4FACFE',
        muted: '#27272a',
      }
    },
  },
  plugins: [],
}
