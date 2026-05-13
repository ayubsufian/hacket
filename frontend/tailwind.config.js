/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        page: '#f7f8f9',
        surface: '#ffffff',
        'surface-raised': '#fafbfc',
        border: '#e5e7eb',
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,.07), 0 1px 3px rgba(0,0,0,.04)',
        'elevated': '0 8px 24px rgba(0,0,0,.08), 0 2px 6px rgba(0,0,0,.04)',
        'glow-green': '0 0 20px rgba(22,163,74,.15)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,.6)',
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in-left': { from: { opacity: '0', transform: 'translateX(-16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        pulse: { '50%': { opacity: '.5' } },
      },
      animation: {
        'fade-in': 'fade-in .3s ease-out',
        'fade-up': 'fade-up .4s ease-out',
        'slide-in-left': 'slide-in-left .3s ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
}
