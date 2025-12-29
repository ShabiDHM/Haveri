// FILE: src/components/business/insights/TaxModule.tsx
// PHOENIX PROTOCOL - TAX MODULE V2.1 (ALIGNMENT)
// 1. LAYOUT: h-auto for mobile, fixed h-[540px] for desktop consistency.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Landmark, TrendingDown, TrendingUp } from 'lucide-react';

interface TaxModuleProps {
    data: {
        vatCollected: number;
        vatDeductible: number;
        estimatedLiability: number;
    };
}

export const TaxModule: React.FC<TaxModuleProps> = ({ data }) => {
    const { t } = useTranslation();
    const { vatCollected, vatDeductible, estimatedLiability } = data;

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md h-auto lg:h-[540px] flex flex-col">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 flex-shrink-0">
                <Landmark className="text-blue-400" /> {t('insights.tax.estimator', 'Vlerësimi i TVSH-së')}
            </h3>

            {/* Main Content Centered */}
            <div className="flex-1 flex flex-col justify-center">
                <div className="relative pt-4 pb-8 text-center">
                    <p className="text-gray-400 text-sm mb-1">{t('insights.tax.toPay', 'Për të paguar (Vlerësim)')}</p>
                    <h2 className={`text-4xl font-bold tracking-tight ${estimatedLiability > 0 ? 'text-white' : 'text-emerald-400'}`}>
                        €{Math.abs(estimatedLiability).toFixed(2)}
                    </h2>
                    {estimatedLiability < 0 && <span className="text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20 mt-2 inline-block">Kredi Tatimore</span>}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-2">
                            <TrendingUp size={14} /> TVSH e Mbledhur
                        </div>
                        <p className="text-xl font-mono text-white">€{vatCollected.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                        <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase mb-2">
                            <TrendingDown size={14} /> TVSH e Zbritshme
                        </div>
                        <p className="text-xl font-mono text-white">€{vatDeductible.toFixed(2)}</p>
                    </div>
                </div>
            </div>
            
            {/* Footer pinned to bottom */}
            <p className="text-[10px] text-gray-500 mt-auto text-center italic border-t border-white/5 pt-3 flex-shrink-0">
                * {t('insights.tax.disclaimer', 'Ky është vetëm një vlerësim. Konsultohuni me kontabilistin tuaj.')}
            </p>
        </div>
    );
};