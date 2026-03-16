/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        sand: '#f6f1e8',
        pine: '#1f4d3f',
        gold: '#b68b2d'
      }
    }
  },
  plugins: []
};
