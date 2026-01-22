module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mycq': {
          'primary': '#667eea',
          'secondary': '#764ba2',
          'online': '#10B981',
          'away': '#F59E0B',
          'busy': '#EF4444',
          'offline': '#6B7280',
          'dark': '#1a1a2e',
          'light': '#f5f7fa'
        }
      },
      fontFamily: {
        'sans': ['Inter', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-once': 'pulse 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}