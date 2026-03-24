/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Existing aliases...
        'canvas': 'var(--bg-base)',
        'surface': 'rgb(var(--bg-surface-rgb) / <alpha-value>)',
        'input-bg': 'var(--bg-input)',
        'primary': 'var(--accent-primary)',
        'primary-hover': 'var(--accent-hover)',
        'primary-start': 'var(--accent-primary)',
        'primary-end': 'var(--accent-hover)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-disabled': 'var(--text-disabled)',
        'text-inverse': '#FFFFFF',
        'success-start': 'rgb(var(--status-success-rgb) / <alpha-value>)',
        'warning-start': 'rgb(var(--status-warning-rgb) / <alpha-value>)',
        'danger-start': 'rgb(var(--status-danger-rgb) / <alpha-value>)',
        'border-main': 'var(--border-main)',
        'border-strong': 'var(--border-strong)',
        // ADD THESE ALIASES to match the class names used in your components
        'border-border-main': 'var(--border-main)',
        'border-border-strong': 'var(--border-strong)',
        'text-text-primary': 'var(--text-primary)',
        'text-text-secondary': 'var(--text-secondary)',
        'text-text-muted': 'var(--text-muted)',
        'text-text-disabled': 'var(--text-disabled)',
        'bg-canvas': 'var(--bg-base)',
        'bg-surface': 'rgb(var(--bg-surface-rgb) / <alpha-value>)',
        'bg-card': 'var(--bg-card)',
        'bg-hover': 'var(--bg-hover)',
      },
      borderColor: {
        'main': 'var(--border-main)',
        'strong': 'var(--border-strong)',
        'border-main': 'var(--border-main)',
        'border-strong': 'var(--border-strong)',
      },
      // ... rest of your config
    },
  },
  plugins: [
    // Add a plugin to generate the `hover-lift` utility
    function({ addUtilities }) {
      addUtilities({
        '.hover-lift': {
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 'var(--shadow-lg)',
          },
        },
      });
    },
  ],
};