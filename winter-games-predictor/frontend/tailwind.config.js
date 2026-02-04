/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Winter theme colors
        ice: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        snow: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
        },
        frost: {
          light: '#e0f7fa',
          DEFAULT: '#80deea',
          dark: '#26c6da',
        },
        aurora: {
          green: '#00e676',
          blue: '#00b0ff',
          purple: '#e040fb',
          pink: '#ff4081',
        }
      },
      backgroundImage: {
        'winter-gradient': 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0ea5e9 100%)',
        'snow-gradient': 'linear-gradient(180deg, #e0f2fe 0%, #ffffff 100%)',
        'aurora-gradient': 'linear-gradient(135deg, #00e676 0%, #00b0ff 50%, #e040fb 100%)',
      },
      animation: {
        'snow-fall': 'snowfall 10s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        snowfall: {
          '0%': { transform: 'translateY(-10vh) rotate(0deg)', opacity: 1 },
          '100%': { transform: 'translateY(100vh) rotate(360deg)', opacity: 0.3 },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(14, 165, 233, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(14, 165, 233, 0.8)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
