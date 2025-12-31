// FILE: src/components/business/briefing/ProductPerformanceCard.tsx
// PHOENIX PROTOCOL - COMPONENT V2.0 (DYNAMIC DATA)
// 1. FIX: Replaced mock arrays with props receiving live 'signals' from the API.
// 2. LOGIC: Filters signals for 'bestseller' and 'low_stock' types.

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Package, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';

interface Signal {
    id: number;
    type: string;
    label: string;
    impact: string;
    message: string;
    action: string;
}

interface ProductPerformanceCardProps {
    signals?: Signal[];
}

export const ProductPerformanceCard: React.FC<ProductPerformanceCardProps> = ({ signals = [] }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // PHOENIX: Filter live data from the signals array
    const bestSellers = useMemo(() => signals.filter(s => s.type === 'bestseller').slice(0, 2), [signals]);
    const lowStockItem = useMemo(() => signals.find(s => s.type === 'low_stock'), [signals]);

    return (
        <div className="bg-gray-900/50 border border-white/10 rounded-3xl p-6 h-full flex flex-col hover:border-blue-500/30 transition-colors duration-500 relative overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-5 relative z-10">
                <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-400" /> {t('dashboard.productsTitle', 'Lëvizjet e Stokut')}
                </h3>
                <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">
                    Live
                </span>
            </div>

            <div className="space-y-4 flex-1 relative z-10">
                {/* Top Sellers Section */}
                <div>
                    <p className="text-xs text-gray-500 mb-2 font-medium">{t('dashboard.bestSellers', 'Më të shiturat sot')}</p>
                    <div className="space-y-2">
                        {bestSellers.length > 0 ? (
                            bestSellers.map((product, index) => (
                                <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/40 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xs">
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm text-white font-medium truncate max-w-[120px]" title={product.label}>{product.label}</p>
                                            <p className="text-xs text-gray-400">{product.message}</p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4 text-gray-500 text-xs italic">
                                {t('finance.noTransactions', 'Nuk ka të dhëna')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Low Stock Alert */}
                {lowStockItem ? (
                    <button 
                        onClick={() => navigate('/business/inventory')}
                        className="w-full text-left mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors group"
                    >
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <div className="flex-1">
                                <p className="text-xs text-red-300 font-bold uppercase">{t('dashboard.lowStockAlert', 'Stoku Kritik')}</p>
                                <p className="text-sm text-white font-medium">
                                    {lowStockItem.label} <span className="text-gray-400 text-xs">({lowStockItem.message})</span>
                                </p>
                            </div>
                            <div className="p-2 bg-red-500/10 group-hover:bg-red-500/30 rounded-lg transition-colors">
                                <ArrowRight className="w-4 h-4 text-red-400" />
                            </div>
                        </div>
                    </button>
                ) : (
                    <div className="mt-auto pt-2 text-center">
                        <span className="text-xs text-emerald-500 flex items-center justify-center gap-1">
                            <CheckCircle size={12} className="inline" /> Stoku OK
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// Internal icon for stock ok state
import { CheckCircle } from 'lucide-react';