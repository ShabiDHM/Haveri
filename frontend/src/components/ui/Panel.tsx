// FILE: src/components/ui/Panel.tsx
// PHOENIX PROTOCOL - PANEL COMPONENT V6.0 (ATOMIC STYLE INJECTION)

import React from 'react';
import clsx from 'clsx';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  glass?: boolean;
}

/**
 * Master Panel Component - Forced Style Injection to bypass global theme overrides.
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
        !noPadding && "p-6",
        className
      )}
      style={glass ? {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)'
      } : {
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-main)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {children}
    </div>
  );
};

export default Panel;