// FILE: src/components/business/insights/ProfitModule.tsx
// PHOENIX PROTOCOL - EDITABLE COST V6.3
// 1. FEATURE: 'Kosto Totale' is now editable, allowing manual overrides of the calculated price.
// 2. LOGIC: Added 'manualCost' state. Prioritizes manual input; falls back to auto-calculation if cleared.

import React, { useState, useEffect } from 'react';
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
    const [showPOModal, setShowPOModal] = useState(false);
    
    // Form States
    const [poQuantity, setPoQuantity] = useState(0);
    const [poSupplier, setPoSupplier] = useState("");
    const [manualCost, setManualCost] = useState<string>(""); // PHOENIX: Track manual input as string

    // Update derived values when prediction arrives
    useEffect(() => {
        if (aiData.prediction) {
            setPoQuantity(aiData.prediction.suggested_quantity);
            setPoSupplier(aiData.prediction.supplier_name || "Furnitori Primar");
            setManualCost(""); // Reset manual override on new prediction
        }
    }, [aiData.prediction]);

    const handleItemClick = async (item: any) => {
        setSelectedItem(item); 
        setLoading(true); 
        setAiData({ prediction: null, trend: null });
        setManualCost(""); // Reset
        try {
            const itemIdAsString = String(item.id);
            const [prediction, trend] = await Promise.all([
                apiService.predictRestock(itemIdAsString), 
                apiService.analyzeSalesTrend(itemIdAsString)
            ]);
            setAiData({ prediction, trend });
        } catch (error) { console.error("AI Analysis Failed", error); } 
        finally { setLoading(false); }
    };
    
    const handleOpenDraftModal = () => {
        if (!aiData.prediction) return;
        setShowPOModal(true);
    };

    // PHOENIX: Logic to determine which price to use
    // If user typed something, use it. Otherwise, calculate (Quantity * UnitCost).
    const calculatedCost = (selectedItem?.cost_per_unit ?? 0) * poQuantity;
    const finalCostValue = manualCost !== "" ? parseFloat(manualCost) || 0 : calculatedCost;

    const handleConfirmAndGeneratePO = async () => {
        if (!selectedItem) return;
        setDrafting(true);
        try {
            await apiService.createPurchaseOrder({
                item_id: String(selectedItem.id), 
                item_name: selectedItem.name, 
                unit: selectedItem.unit,
                quantity: poQuantity,
                estimated_cost: finalCostValue, // Use the finalized value
                supplier_name: poSupplier
            });
            alert(t('inventory.orderDrafted', 'Porosia u draftua dhe u dërgua në Arkivë!'));
            setShowPOModal(false);
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
                {selectedItem && !showPOModal && (
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
                                            <button onClick={handleOpenDraftModal} disabled={!aiData.prediction} className="w-full mt-3 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
                                                {t('inventory.analysis.draftOrder', 'Drafto Porosinë')} <ArrowRight size={16} />
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

            <AnimatePresence>
                {showPOModal && selectedItem && (
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#182235] border border-blue-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative">
                            <div className="p-6 border-b border-white/10">
                                <h3 className="text-xl font-bold text-white">{t('inventory.poModal.title', 'Konfirmo Porosinë')}</h3>
                                <p className="text-sm text-gray-400">{t('inventory.poModal.subtitle', 'Verifikoni detajet para se të gjeneroni dokumentin final.')}</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">{t('inventory.poModal.supplierName', 'Emri i Furnitorit')}</label>
                                    <textarea 
                                        value={poSupplier} 
                                        onChange={(e) => setPoSupplier(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white h-24 resize-none"
                                        placeholder={t('inventory.poModal.supplierPlaceholder', 'Shkruani emrin dhe adresën e furnitorit...')}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('inventory.poModal.quantity', 'Sasia')}</label>
                                        <input type="number" value={poQuantity} onChange={(e) => setPoQuantity(parseFloat(e.target.value) || 0)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white"/>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('inventory.poModal.totalCost', 'Kosto Totale')}</label>
                                        
                                        {/* PHOENIX: EDITABLE COST LOGIC */}
                                        <input 
                                            type="number" 
                                            // If manualCost is set, show it. Otherwise show calculation.
                                            value={manualCost !== "" ? manualCost : calculatedCost.toFixed(2)}
                                            onChange={(e) => setManualCost(e.target.value)}
                                            onBlur={() => {
                                                // Optional: Format on blur if strictly numeric needed
                                                if (manualCost !== "") {
                                                    const val = parseFloat(manualCost);
                                                    if (!isNaN(val)) setManualCost(val.toFixed(2));
                                                }
                                            }}
                                            placeholder={`Calculated: €${calculatedCost.toFixed(2)}`}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500/50 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-black/20 flex justify-end gap-3">
                                <button onClick={() => setShowPOModal(false)} className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors">{t('general.cancel')}</button>
                                <button onClick={handleConfirmAndGeneratePO} disabled={drafting} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white shadow-lg hover:bg-blue-500 transition-colors font-bold flex items-center gap-2 disabled:opacity-50">
                                    {drafting ? <Loader2 size={16} className="animate-spin"/> : null}
                                    {t('inventory.poModal.generatePDF', 'Gjenero PDF')}
                                </button>
                            </div>
                        </motion.div>
                     </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};