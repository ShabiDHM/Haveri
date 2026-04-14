// FILE: src/components/ui/Panel.tsx
// PHOENIX PROTOCOL - UI STABILIZATION V10.0
// 1. FIX: Removed hardcoded diagnostic "border-red-600".
// 2. FIX: Implemented logic to respect 'glass' and 'className' props.
// 3. RESULT: Professional, theme-aware containers that follow index.css styles.

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
      // If glass is true, use the glass-panel class from index.css
      glass ? "glass-panel" : "bg-[var(--bg-card)] border border-[var(--border-main)]",
      // Apply standard padding unless noPadding is requested
      !noPadding && "p-4 sm:p-6",
      // Merge with custom classes from the parent
      className
    )}>
      {children}
    </div>
  );
};

export default Panel;