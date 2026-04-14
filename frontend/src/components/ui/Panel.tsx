// FILE: src/components/ui/Panel.tsx
// PHOENIX PROTOCOL - UI STABILIZATION V10.0

import React from 'react';
import clsx from 'clsx';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  glass?: boolean;
}

export const Panel: React.FC<PanelProps> = ({ 
  children, 
  className = "",
  noPadding = false,
  glass = false
}) => {
  return (
    <div className={clsx(
      "rounded-2xl transition-all duration-300",
      glass ? "glass-panel" : "bg-[var(--bg-card)] border border-[var(--border-main)]",
      !noPadding && "p-4 sm:p-6",
      className
    )}>
      {children}
    </div>
  );
};

export default Panel;