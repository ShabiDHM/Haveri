// FILE: src/components/BrandLogo.tsx
// PHOENIX PROTOCOL - PLATFORM IDENTITY V3.2 (URL FIX)
// 1. FIXED: Now constructs the full, absolute URL for the logo by prepending the API base URL.
// 2. ADDED: An onError handler to gracefully fall back to the icon if the image fails to load.
// 3. CLEANUP: Removed temporary diagnostic logging.

import React, { useState, useMemo } from 'react';
import { Brain } from 'lucide-react';
import { API_V1_URL } from '../services/api'; // PHOENIX: Import the API base URL.

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

  // PHOENIX: Construct the full, absolute URL for the image source.
  const fullLogoUrl = useMemo(() => {
    if (!logoUrl) return null;
    // If the URL is already absolute, use it directly.
    if (logoUrl.startsWith('http')) return logoUrl;
    // Otherwise, prepend the API base URL, ensuring no double slashes.
    const baseUrl = API_V1_URL.endsWith('/') ? API_V1_URL.slice(0, -1) : API_V1_URL;
    const path = logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`;
    return `${baseUrl}${path}`;
  }, [logoUrl]);

  const displayName = firmName || "Haveri";
  const showImage = fullLogoUrl && !imgError;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 flex-shrink-0 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center shadow-lg backdrop-blur-md overflow-hidden">
        {showImage ? (
          <img 
            src={fullLogoUrl!} 
            alt={`${displayName} Logo`} 
            className="w-full h-full object-cover" 
            // PHOENIX: Add an error handler for graceful fallback.
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