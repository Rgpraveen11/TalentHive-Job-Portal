/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0effe',
          100: '#e3e0fd',
          200: '#cbc5fb',
          300: '#aa9ef8',
          400: '#876ef3',
          500: '#6c63ff',
          600: '#5a4de8',
          700: '#4c3ed1',
          800: '#3f34ab',
          900: '#362e87',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};