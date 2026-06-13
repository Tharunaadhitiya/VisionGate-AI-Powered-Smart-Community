/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { 50: 'var(--color-primary-50, #eef2ff)', 100: 'var(--color-primary-100, #e0e7ff)', 200: 'var(--color-primary-200, #c7d2fe)', 300: 'var(--color-primary-300, #a5b4fc)', 400: 'var(--color-primary-400, #818cf8)', 500: 'var(--color-primary-500, #6366f1)', 600: 'var(--color-primary-600, #4f46e5)', 700: 'var(--color-primary-700, #4338ca)', 800: 'var(--color-primary-800, #3730a3)', 900: 'var(--color-primary-900, #312e81)', 950: 'var(--color-primary-950, #1e1b4b)' },
        secondary: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
        danger: { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d' },
        warning: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
        surface: { 50: 'rgb(var(--surface-50, 248 250 252) / <alpha-value>)', 100: 'rgb(var(--surface-100, 241 245 249) / <alpha-value>)', 200: 'rgb(var(--surface-200, 226 232 240) / <alpha-value>)', 300: 'rgb(var(--surface-300, 203 213 225) / <alpha-value>)', 400: 'rgb(var(--surface-400, 148 163 184) / <alpha-value>)', 500: 'rgb(var(--surface-500, 100 116 139) / <alpha-value>)', 600: 'rgb(var(--surface-600, 71 85 105) / <alpha-value>)', 700: 'rgb(var(--surface-700, 51 65 85) / <alpha-value>)', 800: 'rgb(var(--surface-800, 30 41 59) / <alpha-value>)', 900: 'rgb(var(--surface-900, 15 23 42) / <alpha-value>)', 950: 'rgb(var(--surface-950, 2 6 23) / <alpha-value>)' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
    },
  },
  plugins: [],
};
