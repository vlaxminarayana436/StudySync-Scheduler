import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', ...defaultTheme.fontFamily.sans],
        futuristic: ['Orbitron', 'sans-serif'],
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out',
        slideUp: 'slideUp 0.5s ease-in-out',
        glowPulse: 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': {
            boxShadow: '0 0 10px #ec4899, 0 0 20px #7c3aed',
          },
          '50%': {
            boxShadow: '0 0 15px #7c3aed, 0 0 30px #ec4899',
          },
        },
      },
      colors: {
        primary: '#7c3aed',      // Violet-600
        secondary: '#ec4899',    // Pink-500
        accent: '#60a5fa',       // Blue-400
        background: '#fdf4ff',   // Light pink
        border: '#e0e7ff',       // Indigo-100
        muted: '#c4b5fd',        // Soft purple
        highlight: '#f9a8d4',    // Light rose
        danger: '#ef4444',       // Red-500
        canvasDark: '#2e1065',   // Deep violet (from bg)
      },
    },
  },
  plugins: [],
};
