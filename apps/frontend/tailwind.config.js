/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blue: {
          600: '#0055D4', // Adjusted to match the specific blue in the screenshot
        },
      },
    },
  },
  plugins: [],
};
