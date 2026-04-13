// FILE: src/components/ui/Panel.tsx
// PHOENIX PROTOCOL - PANEL COMPONENT V5.1 (GLASS MODE SUPPORT)

import React from 'react';
import clsx from 'clsx';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  /** If true, removes padding and allows nested components to handle spacing */
  noPadding?: boolean;
  /** Enables glassmorphism styling (transparent, blur, light border) */
  glass?: boolean;
}

/**
 * Master Panel Component - Enforces Executive Design System across the app.
 * 
 * Design Rules:
 * - Standard: background var(--bg-card), border var(--border-main), shadow-sm
 * - Glass: background white/5, backdrop-blur, border white/10, shadow-xl
 * - border-radius: 1rem (16px)
 * 
 * Usage:
 * <Panel>Content</Panel>
 * <Panel glass>Glass panel</Panel>
 * <Panel noPadding>Custom spacing</Panel>
 */
export const Panel: React.FC<PanelProps> = ({ 
  children, 
  className = "", 
  noPadding = false,
  glass = false
}) => {
  return (
    <div 
      className={clsx(
        "rounded-2xl border transition-all duration-300",
        glass 
          ? "bg-white/5 backdrop-blur-md border-white/10 shadow-xl" 
          : "bg-card border-border-main shadow-sm",
        !noPadding && "p-6",
        className
      )}
    >
      {children}
    </div>
  );
};

export default Panel;