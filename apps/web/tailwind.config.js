/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        neu: {
          bg: 'var(--bg)',
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          accent: 'var(--accent)',
          'accent-hover': 'var(--accent-hover)',
        },
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#5B6CFF',
          600: '#5B6CFF',
          700: '#4A5AE8',
        },
      },
      borderRadius: {
        'neu-sm': '12px',
        'neu-md': '16px',
        'neu-lg': '24px',
      },
      boxShadow: {
        'neu-raised': 'var(--shadow-raised)',
        'neu-raised-sm': 'var(--shadow-raised-sm)',
        'neu-raised-lg': 'var(--shadow-raised-lg)',
        'neu-inset': 'var(--shadow-inset)',
        'neu-inset-sm': 'var(--shadow-inset-sm)',
      },
      transitionDuration: {
        200: '200ms',
      },
    },
  },
  plugins: [],
};
