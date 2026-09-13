/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E88E5',
          50: '#E3F2FD',
          100: '#BBDEFB',
          200: '#90CAF9',
          300: '#64B5F6',
          400: '#42A5F5',
          500: '#1E88E5',
          600: '#1976D2',
          700: '#1565C0',
          800: '#0D47A1',
          900: '#0A3880',
        },
        success: {
          DEFAULT: '#2E7D32',
          50: '#E8F5E9',
          100: '#C8E6C9',
          500: '#2E7D32',
          600: '#276A2A',
          700: '#1B5E20',
        },
        warning: {
          DEFAULT: '#F57C00',
          50: '#FFF3E0',
          100: '#FFE0B2',
          500: '#F57C00',
          600: '#EF6C00',
          700: '#E65100',
        },
        'dark-text': {
          DEFAULT: '#1E293B',
          light: '#334155',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
      },
    },
  },
  plugins: [],
}