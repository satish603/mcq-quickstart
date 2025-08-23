/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // <-- required for the ThemeToggle
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    // If you also use /app or /src, keep these:
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // optional, but helps keep visuals consistent
      container: { center: true, padding: "1rem" },
      borderRadius: { '2xl': '1rem', '3xl': '1.25rem' },
      boxShadow: {
        'soft': '0 8px 24px rgba(0,0,0,0.06)',
      },
      // If you want a custom font:
      // fontFamily: {
      //   sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      // },
    },
  },
  plugins: [
    // Optional but recommended for nicer inputs & prose
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/typography'),
    // require('@tailwindcss/line-clamp'),
  ],
}
