// FILE: src/components/ui/Panel.tsx
// DIAGNOSTIC TEST – ADD RED BORDER TO VERIFY PANEL USAGE

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
    <div className={clsx("border-4 border-red-600", className)}>
      {children}
    </div>
  );
};

export default Panel;