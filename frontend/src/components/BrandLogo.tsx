// FILE: src/components/BrandLogo.tsx
// PHOENIX PROTOCOL - PLATFORM IDENTITY V2.2 (BRAIN ICON)
// 1. UPDATE: Replaced 'Scale' icon with 'Brain' icon to match Haveri AI branding.
// 2. STATUS: Logo iconography updated.

import React from 'react';
import { Brain } from 'lucide-react'; // PHOENIX: Imported Brain icon

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ className = "", showText = true }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Platform Icon - Brain (AI Intelligence) */}
      <div className="w-8 h-8 flex-shrink-0 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center shadow-lg backdrop-blur-md">
        {/* PHOENIX: Render Brain icon */}
        <Brain className="w-5 h-5 text-white" />
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