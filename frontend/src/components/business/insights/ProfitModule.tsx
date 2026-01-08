// FILE: src/components/business/insights/ProfitModule.tsx
// PHOENIX PROTOCOL - STOCK INTELLIGENCE V4.3 (TYPE SAFETY FIX)
// 1. CRITICAL FIX: Explicitly cast 'selectedItem.id' to a String before API calls.
// 2. REASON: Resolves the 422 Unprocessable Entity error by ensuring the backend receives a string, not a complex object or null.
// 3. I18N: The component is fully localized.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, AlertCircle, TrendingUp, ShoppingCart, Loader2, X, ArrowRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService, RestockPrediction, SalesTrendAnalysis } from '../../../services/api';

interface ProfitModuleProps {
    data: {
        totalStockValue: number;
        lowStockItems: any[];
    };
}

export const ProfitModule: React.FC<ProfitModuleProps> = ({ data }) => {
    const { t } = useTranslation();
    const { totalStockValue, lowStockItems } = data;

    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [drafting, setDrafting] = useState(false);
    const [aiData, setAiData] = useState<{ prediction: RestockPrediction | null, trend: SalesTrendAnalysis | null }>({ prediction: null, trend: null });

    const handleItemClick = async (item: any) => {
        setSelectedItem(item); setLoading(true); setAiData({ prediction: null, trend: null });
        try {
            // PHOENIX FIX: Ensure item.id is a string
            const itemIdAsString = String(item.id);
            const [prediction, trend] = await Promise.all([
                apiService.predictRestock(itemIdAsString), 
                apiService.analyzeSalesTrend(itemIdAsString)
            ]);
            setAiData({ prediction, trend });
        } catch (error) { console.error("AI Analysis Failed", error); } 
        finally { setLoading(false); }
    };

    const handleDraftOrder = async () => {
        if (!selectedItem) return;
        setDrafting(true);
        try {
            // PHOENIX FIX: Ensure item.id is a string
            await apiService.createPurchaseOrder({
                item_id: String(selectedItem.id), 
                item_name: selectedItem.name, 
                unit: selectedItem.unit,
                quantity: aiData.prediction?.suggested_quantity ?? 0,
                estimated_cost: aiData.prediction?.estimated_cost ?? 0,
                supplier_name: aiData.prediction?.supplier_name ?? "Primary Supplier"
            });
            alert(t('inventory.orderDrafted', 'Porosia u draftua dhe u dërgua në Arkivë!'));
            setSelectedItem(null);
        } catch (error) {
            console.error("Drafting failed", error);
            alert("Dështoi krijimi i dokumentit. Ju lutem provoni përsëri.");
        } finally {
            setDrafting(false);
        }
    };

    return (
        <>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md h-auto lg:h-[540px] flex flex-col">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2 flex-shrink-0"><Package className="text-purple-400" /> {t('insights.inventory.title', 'Inteligjenca e Stokut')}</h3>
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-xl flex-shrink-0">
                    <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">{t('insights.inventory.value', 'Vlera Totale e Stokut')}</p>
                    <p className="text-2xl font-mono font-bold text-white">€{totalStockValue.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{t('insights.inventory.valueDesc', 'Para të bllokuara në rafte')}</p>
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-3 flex-shrink-0">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t('inventory.lowStock', 'Stoku Kritik')}</h4>
                        <span className="bg-rose-500/10 text-rose-400 text-xs px-2 py-0.5 rounded-full font-bold">{lowStockItems.length} {t('inventory.itemsCount', 'Artikuj')}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
                        {lowStockItems.length === 0 ? (
                            <p className="text-gray-500 text-sm italic mt-2">{t('general.allGood', 'Gjithçka në rregull!')}</p>
                        ) : (
                            lowStockItems.map((item: any, idx: number) => (
                                <div key={idx} onClick={() => handleItemClick(item)} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 shrink-0 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 group-hover:scale-110 transition-transform"><Zap size={14} /></div>
                                        <span className="text-sm text-gray-200 font-medium truncate">{item.name}</span>
                                    </div>
                                    <span className="text-xs font-mono text-rose-400 flex items-center gap-1 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20"><AlertCircle size={10} /> {item.current_stock} {item.unit}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            <AnimatePresence>
                {selectedItem && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#0f172a] border border-purple-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative">
                            <div className="p-6 border-b border-white/10 bg-purple-900/20 flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">{selectedItem.name}<span className="text-xs bg-rose-500 text-white px-2 py-0.5 rounded-full">{t('inventory.analysis.critical', 'Kritike')}</span></h3>
                                    <p className="text-sm text-gray-400 mt-1">{t('inventory.analysis.currentStock', 'Stoku Aktual')}: {selectedItem.current_stock} {selectedItem.unit}</p>
                                </div>
                                <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"><X size={20}/></button>
                            </div>
                            <div className="p-6 min-h-[300px]">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-full py-10 space-y-4">
                                        <Loader2 size={40} className="animate-spin text-purple-500" />
                                        <p className="text-gray-400 animate-pulse">{t('inventory.analysis.analyzing', 'Inteligjenca Artificiale po analizon...')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="bg-black/40 border border-white/10 rounded-xl p-4 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                                            <h4 className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-2"><ShoppingCart size={16} /> {t('inventory.analysis.restockTitle', 'Sugjerim për Rimbushje')}</h4>
                                            <p className="text-gray-300 text-sm mb-3 leading-relaxed">{aiData.prediction?.reason || ""}</p>
                                            <div className="flex items-center justify-between bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                                                <div>
                                                    <p className="text-xs text-blue-300 uppercase font-bold">{t('inventory.analysis.orderNow', 'Porosit Tani')}</p>
                                                    <p className="text-lg font-mono font-bold text-white">{aiData.prediction?.suggested_quantity ?? 0} {selectedItem.unit}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-400">{t('inventory.analysis.estimatedValue', 'Vlera e Përafërt')}</p>
                                                    <p className="text-lg font-mono font-bold text-white">€{(aiData.prediction?.estimated_cost ?? 0).toFixed(2)}</p>
                                                </div>
                                            </div>
                                            <button onClick={handleDraftOrder} disabled={drafting} className="w-full mt-3 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
                                                {drafting ? (<><Loader2 size={16} className="animate-spin" /> {t('inventory.analysis.drafting', 'Duke draftuar...')}</>) : (<>{t('inventory.analysis.draftOrder', 'Drafto Porosinë')} <ArrowRight size={16} /></>)}
                                            </button>
                                        </div>
                                        <div className="bg-black/40 border border-white/10 rounded-xl p-4 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                                            <h4 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2"><TrendingUp size={16} /> {t('inventory.analysis.trendTitle', 'Analiza e Trendit')}</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">{t('inventory.analysis.performance', 'Performance')}</p>
                                                    <p className="text-sm text-gray-300">{aiData.trend?.trend_analysis || t('inventory.analysis.unavailable', 'E padisponueshme')}</p>
                                                </div>
                                                <div className="pt-2 border-t border-white/5">
                                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">{t('inventory.analysis.crossSell', 'Mundësi Cross-Sell')}</p>
                                                    <p className="text-sm text-gray-300">{aiData.trend?.cross_sell_opportunities || t('inventory.analysis.unavailable', 'E padisponueshme')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};