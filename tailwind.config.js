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
        background: '#FFFFFF',
        foreground: '#111111',
        card: '#FFFFFF',
        border: '#E5E5E1',
        primary: '#111111',
        accent: '#F3F3F0',
        muted: '#F6F6F3',
        'muted-foreground': '#666661',
        success: '#287A44',
        warning: '#9A6700',
        danger: '#C93535',
      }
    },
  },
  plugins: [],
}
