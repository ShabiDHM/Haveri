// FILE: src/components/BrandLogo.tsx
// PHOENIX PROTOCOL - PLATFORM IDENTITY V7.0 (DESIGN SYSTEM STANDARDIZED)
// STATUS: VERIFIED - COMPLETE FILE REPLACEMENT

import React from 'react';
import { Brain } from 'lucide-react';

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ 
  className = "", 
  showText = true,
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 flex-shrink-0 bg-surface border border-border-main rounded-lg flex items-center justify-center shadow-sm overflow-hidden">
        <Brain className="w-5 h-5 text-primary" />
      </div>
      
      {showText && (
        <span className="text-xl font-bold bg-gradient-to-r from-text-primary to-text-muted bg-clip-text text-transparent whitespace-nowrap">
          Haveri AI
        </span>
      )}
    </div>
  );
};

export default BrandLogo;