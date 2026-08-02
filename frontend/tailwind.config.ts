import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Carried over from the existing prototype design language
        navy:   { DEFAULT: '#0a0f1e', 2: '#0f1729', 3: '#151f3a' },
        gold:   { DEFAULT: '#c9a84c', 2: '#e8c96a', 3: '#f5e0a0' },
        ivory:  { DEFAULT: '#f5f0e8', 2: '#ede8df' },
        accent: { DEFAULT: '#1abc9c' },
        danger: { DEFAULT: '#c0392b' },
        success:{ DEFAULT: '#27ae60' },
        info:   { DEFAULT: '#2980b9' },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        premium: '0 8px 48px rgba(0,0,0,0.6)',
        gold:    '0 4px 24px rgba(201,168,76,0.25)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease forwards',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,168,76,0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(201,168,76,0)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
