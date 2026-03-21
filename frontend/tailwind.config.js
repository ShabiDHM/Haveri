/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'canvas': 'var(--bg-base)',
        'surface': 'rgb(var(--bg-surface-rgb) / <alpha-value>)',
        'card': 'var(--bg-card)',
        'input': 'var(--bg-input)',
        
        'border-main': 'var(--border-main)',
        'border-strong': 'var(--border-strong)',
        'primary': 'var(--accent-primary)',
        
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        
        'success-start': 'rgb(var(--status-success-rgb) / <alpha-value>)',
        'warning-start': 'rgb(var(--status-warning-rgb) / <alpha-value>)',
        'danger-start': 'rgb(var(--status-danger-rgb) / <alpha-value>)',
      },
      borderRadius: {
        'panel': '1rem',
      },
    },
  },
  plugins: [],
}