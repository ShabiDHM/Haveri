import React from 'react';
import { useTranslation } from 'react-i18next';
import { Package, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';

export const ProductPerformanceCard: React.FC = () => {
    const { t } = useTranslation();

    // Mock Data - In real app, fetch from /api/stats/products
    const topProducts = [
        { name: "Espresso Macchiato", count: 142, trend: "+12%" },
        { name: "Coca Cola 0.33l", count: 98, trend: "+5%" }
    ];

    const lowStock = { name: "Red Bull", remaining: 12, unit: "copë" };

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
                        {topProducts.map((product, index) => (
                            <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/40 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xs">
                                        #{index + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm text-white font-medium">{product.name}</p>
                                        <p className="text-xs text-gray-400">{product.count} {t('dashboard.soldUnits', 'të shitura')}</p>
                                    </div>
                                </div>
                                <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" /> {product.trend}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Low Stock Alert - Critical */}
                <div className="mt-2">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <div className="flex-1">
                            <p className="text-xs text-red-300 font-bold uppercase">{t('dashboard.lowStockAlert', 'Stoku Kritik')}</p>
                            <p className="text-sm text-white font-medium">
                                {lowStock.name} <span className="text-gray-400 text-xs">({t('dashboard.only', 'vetëm')} {lowStock.remaining} {lowStock.unit})</span>
                            </p>
                        </div>
                        <button className="p-2 hover:bg-red-500/20 rounded-lg transition-colors">
                            <ArrowRight className="w-4 h-4 text-red-400" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};