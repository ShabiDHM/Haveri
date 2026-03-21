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
        // Background
        'canvas': 'var(--bg-base)',
        'surface': 'var(--bg-surface)',
        'card': 'var(--bg-card)',
        
        // Borders
        'border-main': 'var(--border-main)',
        'border-strong': 'var(--border-strong)',
        
        // Text
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        
        // Accents
        'primary-start': 'var(--accent-primary)',
        'danger-start': 'var(--status-danger)',
        'success-start': 'var(--status-success)',
        'warning-start': 'var(--status-warning)',
      },
      borderRadius: {
        'panel': '1.5rem',
      },
    },
  },
  plugins: [],
}