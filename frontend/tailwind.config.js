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
        // Foundation - RGB enabled for opacity support
        'canvas': 'var(--bg-base)',
        'surface': 'rgb(var(--bg-surface-rgb) / <alpha-value>)',
        'input-bg': 'var(--bg-input)',
        
        // Typography
        'primary': 'var(--accent-primary)',
        'primary-hover': 'var(--accent-hover)',
        'primary-start': 'var(--accent-primary)',
        'primary-end': 'var(--accent-hover)',
        
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-disabled': 'var(--text-disabled)',
        'text-inverse': '#FFFFFF',
        
        // Status with RGB support
        'success-start': 'rgb(var(--status-success-rgb) / <alpha-value>)',
        'warning-start': 'rgb(var(--status-warning-rgb) / <alpha-value>)',
        'danger-start': 'rgb(var(--status-danger-rgb) / <alpha-value>)',
        
        // Border Colors
        'border-main': 'var(--border-main)',
        'border-strong': 'var(--border-strong)',
      },
      borderColor: {
        'main': 'var(--border-main)',
        'strong': 'var(--border-strong)',
        'primary': 'var(--border-primary)',
        'success': 'var(--status-success)',
        'danger': 'var(--status-danger)',
      },
      boxShadow: {
        'lawyer-light': '0 4px 8px rgba(15, 22, 35, 0.08), 0 8px 24px rgba(15, 22, 35, 0.12), 0 0 0 1px rgba(99, 102, 241, 0.1)',
        'accent-glow': '0 0 15px rgba(99, 102, 241, 0.3)',
        'inner-trough': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        'panel': '1.5rem',
      },
    },
  },
  plugins: [],
}