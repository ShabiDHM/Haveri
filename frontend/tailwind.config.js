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
        // Backgrounds with opacity support
        'canvas': 'var(--bg-base)',
        'surface': 'rgb(var(--bg-surface-rgb) / <alpha-value>)',
        'card': 'var(--bg-card)',
        
        // Borders
        'border-main': 'var(--border-main)',
        'border-strong': 'var(--border-strong)',
        'primary': 'var(--accent-primary)',
        
        // Text
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        
        // Accents (Synced with index.css variables)
        'primary-start': 'var(--accent-primary)',
        'danger-start': 'var(--status-danger)',
        'success-start': 'var(--status-success)',
        'warning-start': 'var(--status-warning)',

        // Explicit status colors for logic in components
        'danger': 'var(--status-danger)',
        'success': 'var(--status-success)',
        'warning': 'var(--status-warning)',
      },
      borderRadius: {
        'panel': '1rem', // Match index.css .panel definition
      },
    },
  },
  plugins: [],
}