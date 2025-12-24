// FILE: src/components/BrandLogo.tsx
// PHOENIX PROTOCOL - PLATFORM IDENTITY V3.3 (FALLBACK CORRECTION)
// 1. FIXED: Changed the default fallback text from "Haveri" to "Haveri AI".
// 2. LOGIC: Ensures that if a dynamic firm name is not available, the UI displays the correct, consistent brand name.
// 3. STATUS: The component now correctly reflects the platform's identity.

import React, { useState, useMemo } from 'react';
import { Brain } from 'lucide-react';
import { API_V1_URL } from '../services/api';

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
  const [imgError, setImgError] = useState(false);

  const fullLogoUrl = useMemo(() => {
    if (!logoUrl) return null;
    if (logoUrl.startsWith('http') || logoUrl.startsWith('blob:')) return logoUrl;
    const baseUrl = API_V1_URL.endsWith('/') ? API_V1_URL.slice(0, -1) : API_V1_URL;
    const path = logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`;
    return `${baseUrl}${path}`;
  }, [logoUrl]);

  // PHOENIX FIX: Use the dynamic firm name, or fall back to the correct brand name "Haveri AI".
  const displayName = firmName || "Haveri AI";
  const showImage = fullLogoUrl && !imgError;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 flex-shrink-0 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center shadow-lg backdrop-blur-md overflow-hidden">
        {showImage ? (
          <img 
            src={fullLogoUrl!} 
            alt={`${displayName} Logo`} 
            className="w-full h-full object-cover" 
            onError={() => setImgError(true)}
          />
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