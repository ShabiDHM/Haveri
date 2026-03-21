// FILE: src/components/ui/Panel.tsx
// PHOENIX PROTOCOL - PANEL COMPONENT V3.0 (TAILWIND UTILITY-FIRST)
// UPDATED: Uses Tailwind border utilities to override Preflight reset

import React from 'react';
import clsx from 'clsx';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  /** If true, removes padding and allows nested components to handle spacing */
  noPadding?: boolean;
}

/**
 * Master Panel Component - Enforces Admin Panel Aesthetic Globally
 * 
 * Design Rules:
 * - border: 1px solid via Tailwind's border utility
 * - border-radius: 1rem (16px)
 * - background: var(--bg-card)
 * - shadow: var(--shadow-sm)
 * 
 * Usage:
 * <Panel className="p-6">Content</Panel>
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
        "panel border border-border-strong",
        !noPadding && "p-6",
        className
      )}
    >
      {children}
    </div>
  );
};

export default Panel;