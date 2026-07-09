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
        background: '#111111',
        foreground: '#FFFFFF',
        card: '#1A1A1A',
        border: 'rgba(255, 255, 255, 0.08)',
        primary: '#00E5FF',
        accent: '#B400FF',
        muted: '#222222',
        'muted-foreground': '#A1A1AA',
      }
    },
  },
  plugins: [],
}
