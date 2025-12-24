// FILE: src/components/BrandLogo.tsx
// PHOENIX PROTOCOL - PLATFORM IDENTITY V4.0 (IMMUTABLE BRAND)
// 1. REMOVED: All dynamic props ('firmName', 'logoUrl') have been removed.
// 2. MODIFIED: The component now permanently renders the 'Haveri AI' name and Brain icon.
// 3. REASON: This guarantees brand consistency across the entire application and removes complex, fragile state dependencies.

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
      <div className="w-8 h-8 flex-shrink-0 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center shadow-lg backdrop-blur-md overflow-hidden">
        <Brain className="w-5 h-5 text-white" />
      </div>
      
      {showText && (
        <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent whitespace-nowrap">
          Haveri AI
        </span>
      )}
    </div>
  );
};

export default BrandLogo;