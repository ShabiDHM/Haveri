// FILE: src/components/BrandLogo.tsx
// PHOENIX PROTOCOL - PLATFORM IDENTITY V3.0 (DYNAMIC BRANDING)
// 1. REFACTOR: Component now accepts 'firmName' and 'logoUrl' props for dynamic display.
// 2. LOGIC: Renders the user's uploaded logo if available, otherwise falls back to the default icon.
// 3. LOGIC: Displays the user's firm name, falling back to a default if not provided.

import React from 'react';
import { Brain } from 'lucide-react';

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
  firmName?: string;
  logoUrl?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ 
  className = "", 
  showText = true,
  firmName,
  logoUrl
}) => {
  const displayName = firmName || "Haveri";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 flex-shrink-0 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center shadow-lg backdrop-blur-md overflow-hidden">
        {logoUrl ? (
          <img src={logoUrl} alt={`${displayName} Logo`} className="w-full h-full object-cover" />
        ) : (
          <Brain className="w-5 h-5 text-white" />
        )}
      </div>
      
      {showText && (
        <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent whitespace-nowrap">
          {displayName}
        </span>
      )}
    </div>
  );
};

export default BrandLogo;