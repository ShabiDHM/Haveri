// FILE: src/components/BrandLogo.tsx
// PHOENIX PROTOCOL - PLATFORM IDENTITY V2.1 (REBRANDING)
// 1. REBRAND: Updated platform name from "Juristi AI" to "Omni" as per mandate.
// 2. STATUS: Logo text updated.

import React from 'react';
import { Scale } from 'lucide-react';

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ className = "", showText = true }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Platform Icon - Scales of Justice */}
      <div className="w-8 h-8 flex-shrink-0 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center shadow-lg backdrop-blur-md">
        <Scale className="w-5 h-5 text-white" />
      </div>
      
      {/* Platform Name */}
      {showText && (
        <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent whitespace-nowrap">
          Omni
        </span>
      )}
    </div>
  );
};

export default BrandLogo;