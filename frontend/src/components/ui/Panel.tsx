// FILE: src/components/ui/Panel.tsx
// DIAGNOSTIC TEST – RED BORDER TO VERIFY USAGE

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
  noPadding: _noPadding,
  glass: _glass
}) => {
  return (
    <div className={clsx("border-4 border-red-600", className)}>
      {children}
    </div>
  );
};

export default Panel;