// FILE: src/components/ui/Panel.tsx
// PHOENIX PROTOCOL - PANEL COMPONENT V5.0 (EXECUTIVE DESIGN SYSTEM)
// Uses Tailwind classes for border, shadow, and background.

import React from 'react';
import clsx from 'clsx';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  /** If true, removes padding and allows nested components to handle spacing */
  noPadding?: boolean;
}

/**
 * Master Panel Component - Enforces Executive Design System across the app.
 * 
 * Design Rules:
 * - background: var(--bg-card)
 * - border: 1px solid var(--border-main)
 * - border-radius: 1rem (16px)
 * - shadow: var(--shadow-sm)
 * 
 * Usage:
 * <Panel>Content</Panel>
 * <Panel noPadding>Custom spacing</Panel>
 */
export const Panel: React.FC<PanelProps> = ({ 
  children, 
  className = "", 
  noPadding = false 
}) => {
  return (
    <div 
      className={clsx(
        "bg-card rounded-2xl border border-border-main shadow-sm",
        !noPadding && "p-6",
        className
      )}
    >
      {children}
    </div>
  );
};

export default Panel;