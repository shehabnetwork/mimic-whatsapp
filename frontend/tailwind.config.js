/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        wa: {
          dark: '#075E54',
          teal: '#128C7E',
          green: '#25D366',
          light: '#DCF8C6',
          bubble: '#FFFFFF',
          bg: '#ECE5DD',
          header: '#075E54',
          input: '#F0F0F0',
          time: '#8696A0',
          border: '#E9EDEF',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
