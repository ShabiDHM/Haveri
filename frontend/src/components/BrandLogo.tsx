// FILE: src/components/BrandLogo.tsx
// PHOENIX PROTOCOL - PLATFORM IDENTITY V3.1 (DIAGNOSTIC LOGGING)
// 1. ADDED: Console logging to trace the props being received by this component.
// 2. LOGIC: This will definitively prove whether the dynamic data from AuthContext is arriving here or not.
// 3. STATUS: This is a temporary diagnostic tool.

import React, { useEffect } from 'react';
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
  
  // PHOENIX DIAGNOSTIC: Log received props every time the component renders.
  useEffect(() => {
    console.log('[PHOENIX DIAGNOSTIC] BrandLogo Component Rendered. Props received:', {
      firmName: firmName,
      logoUrl: logoUrl,
    });
  });

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