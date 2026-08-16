// FILE: src/components/BrandLogo.tsx
// HAVERI - ASISTENTI VIRTUAL

import React from 'react';
import { Brain } from 'lucide-react';

interface BrandLogoProps {
  className?: string;
  showSubtitle?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', showSubtitle = true }) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Ikona e Logove */}
      <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary-start to-blue-500 flex items-center justify-center text-white shadow-md shadow-primary-start/20 shrink-0">
        <Brain size={20} className="stroke-[2.2]" />
      </div>

      {/* Titulli dhe Nëntitulli */}
      <div className="flex flex-col justify-center">
        <span className="text-lg font-black tracking-tight text-text-primary leading-none">
          Haveri
        </span>
        {showSubtitle && (
          <span className="text-[10px] font-bold text-primary-start uppercase tracking-widest leading-none mt-1">
            Asistenti Virtual
          </span>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;