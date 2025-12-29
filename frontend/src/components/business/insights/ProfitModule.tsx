// FILE: src/components/business/insights/ProfitModule.tsx
// PHOENIX PROTOCOL - PROFIT MODULE V2.0 (SYMMETRY FILL)
// 1. LAYOUT: Added h-full to root to ensure it stretches to match DebtModule.
// 2. CONTENT: Distributed vertical spacing.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Package, AlertCircle } from 'lucide-react';

interface ProfitModuleProps {
    data: {
        totalStockValue: number;
        lowStockItems: any[];
    };
}

export const ProfitModule: React.FC<ProfitModuleProps> = ({ data }) => {
    const { t } = useTranslation();
    const { totalStockValue, lowStockItems } = data;

    return (
        // Added: h-full flex flex-col to fill the grid cell height defined by DebtModule
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md h-full flex flex-col">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 flex-shrink-0">
                <Package className="text-purple-400" /> {t('insights.inventory.title', 'Inteligjenca e Stokut')}
            </h3>

            <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-xl flex-shrink-0">
                <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">{t('insights.inventory.value', 'Vlera Totale e Stokut')}</p>
                <p className="text-2xl font-mono font-bold text-white">€{totalStockValue.toFixed(2)}</p>
                <p className="text-[10px] text-gray-500 mt-1">{t('insights.inventory.valueDesc', 'Para të bllokuara në rafte')}</p>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-3 flex-shrink-0">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t('inventory.lowStock', 'Stoku Kritik')}</h4>
                    <span className="bg-rose-500/10 text-rose-400 text-xs px-2 py-0.5 rounded-full font-bold">{lowStockItems.length} Artikuj</span>
                </div>
                
                {/* Scrollable Low Stock List */}
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
                    {lowStockItems.length === 0 ? (
                        <p className="text-gray-500 text-sm italic mt-2">{t('general.allGood', 'Gjithçka në rregull!')}</p>
                    ) : (
                        lowStockItems.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5 shrink-0">
                                <span className="text-sm text-gray-300 truncate max-w-[60%]">{item.name}</span>
                                <span className="text-xs font-mono text-rose-400 flex items-center gap-1">
                                    <AlertCircle size={10} /> {item.current_stock} {item.unit}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};