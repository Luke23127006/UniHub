/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],

  // 'class' strategy lets ThemeContext toggle dark mode by adding/removing
  // the 'dark' class on <html> — no media query dependency.
  darkMode: 'class',

  theme: {
    extend: {
      colors: {
        unihub: {
          bg: '#F9F7F1',
          text: '#2C3539',
          muted: '#5C5C5C',
          primary: {
            DEFAULT: '#800000',
            hover: '#660000',
          },
          gold: '#FACC15',
          card: '#FFFFFF',
          border: '#E3DCCB',
          badge: {
            bg: 'rgba(128, 0, 0, 0.1)',
            text: '#800000',
          },
        },
      },
    },
  },

  plugins: [],
};
