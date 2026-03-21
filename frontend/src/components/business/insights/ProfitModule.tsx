// FILE: src/components/business/insights/ProfitModule.tsx
// PHOENIX PROTOCOL - PROFIT MODULE V12.0 (VISIBLE ACCENT BAR)

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, AlertCircle, TrendingUp, ShoppingCart, Loader2, X, ArrowRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../../services/api';
import { RestockPrediction, SalesTrendAnalysis } from '../../../data/types';

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
    
    const [poQuantity, setPoQuantity] = useState(0);
    const [poSupplier, setPoSupplier] = useState("");
    const [manualCost, setManualCost] = useState<string>("");

    useEffect(() => {
        if (aiData.prediction) {
            setPoQuantity(aiData.prediction.suggested_quantity);
            setPoSupplier(aiData.prediction.supplier_name || "Furnitori Primar");
            setManualCost(""); 
        }
    }, [aiData.prediction]);

    const handleItemClick = async (item: any) => {
        setSelectedItem(item); 
        setLoading(true); 
        setAiData({ prediction: null, trend: null });
        setManualCost("");
        try {
            const itemIdAsString = String(item._id); 
            const [prediction, trend] = await Promise.all([
                apiService.predictRestock(itemIdAsString), 
                apiService.analyzeSalesTrend(itemIdAsString)
            ]);
            setAiData({ prediction, trend });
        } catch (error) { 
            console.error("AI Analysis Fetch Failed:", error);
        } finally { 
            setLoading(false); 
        }
    };
    
    const handleOpenDraftModal = () => {
        if (!aiData.prediction) return;
        setShowPOModal(true);
    };

    const calculatedCost = (selectedItem?.cost_per_unit ?? 0) * poQuantity;
    const finalCostValue = manualCost !== "" ? parseFloat(manualCost) || 0 : calculatedCost;

    const handleConfirmAndGeneratePO = async () => {
        if (!selectedItem) return;
        setDrafting(true);
        try {
            await apiService.createPurchaseOrder({
                item_id: String(selectedItem._id), 
                item_name: selectedItem.name, 
                unit: selectedItem.unit,
                quantity: poQuantity,
                estimated_cost: finalCostValue,
                supplier_name: poSupplier
            });
            alert(t('inventory.orderDrafted', 'Porosia u draftua dhe u dërgua në Arkivë!'));
            setShowPOModal(false);
            setSelectedItem(null);
        } catch (error) {
            console.error("Drafting failed:", error);
            alert("Dështoi krijimi i dokumentit. Ju lutem provoni përsëri.");
        } finally {
            setDrafting(false);
        }
    };

    const hasLowStock = lowStockItems.length > 0;

    return (
        <>
            <div className="bg-card border border-border-strong rounded-2xl flex flex-col h-full min-h-[480px] max-h-[600px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative">
                {/* Colored top accent bar - 4px with glow - Yellow if low stock, Green if all good */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${hasLowStock ? 'from-warning-start to-warning-start/80' : 'from-success-start to-success-start/80'} z-10 shadow-[0_0_8px_rgba(245,158,11,0.5)]`} />
                
                <div className="p-5 flex-shrink-0">
                    <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                        <Package className="text-primary" size={20} /> 
                        {t('insights.inventory.title', 'Inteligjenca e Stokut')}
                    </h3>
                    
                    <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl">
                        <p className="text-text-muted text-xs uppercase tracking-wider font-semibold mb-1">{t('insights.inventory.value', 'Vlera Totale e Stokut')}</p>
                        <p className="text-2xl font-mono font-bold text-text-primary">€{totalStockValue.toFixed(2)}</p>
                        <p className="text-[10px] text-text-muted mt-1">{t('insights.inventory.valueDesc', 'Para të bllokuara në rafte')}</p>
                    </div>

                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <div className={`h-3 w-1 ${hasLowStock ? 'bg-warning-start' : 'bg-success-start'} rounded-full`}></div>
                            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('inventory.lowStock', 'Stoku Kritik')}</h4>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${hasLowStock ? 'bg-warning-start/10 text-warning-start border-warning-start/20' : 'bg-success-start/10 text-success-start border-success-start/20'}`}>
                            {lowStockItems.length} {t('inventory.itemsCount', 'Artikuj')}
                        </span>
                    </div>
                </div>

                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2 custom-scrollbar">
                    {lowStockItems.length === 0 ? (
                        <div className="p-6 text-center bg-surface rounded-xl border border-border-strong">
                            <p className="text-text-muted text-sm">{t('general.allGood', 'Gjithçka në rregull!')}</p>
                        </div>
                    ) : (
                        lowStockItems.map((item: any, idx: number) => (
                            <div 
                                key={idx} 
                                onClick={() => handleItemClick(item)} 
                                className="flex justify-between items-center p-3 bg-surface rounded-xl border border-border-strong hover:border-warning-start/40 hover:shadow-sm transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-3 overflow-hidden flex-1">
                                    <div className="p-2 bg-warning-start/10 rounded-lg text-warning-start group-hover:scale-105 transition-transform">
                                        <Zap size={14} />
                                    </div>
                                    <span className="text-sm text-text-secondary font-medium truncate">{item.name}</span>
                                </div>
                                <span className="text-xs font-mono text-warning-start flex items-center gap-1 bg-warning-start/10 px-2 py-1 rounded-lg border border-warning-start/20 shrink-0">
                                    <AlertCircle size={10} /> {item.current_stock} {item.unit}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <AnimatePresence>
                {selectedItem && !showPOModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-glass backdrop-blur-xl border border-primary/30 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden relative">
                            <div className="p-5 border-b border-border-strong bg-primary/20 flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                        {selectedItem.name}
                                        <span className="text-xs bg-danger text-inverse px-2 py-0.5 rounded-full">{t('inventory.analysis.critical', 'Kritike')}</span>
                                    </h3>
                                    <p className="text-sm text-text-muted mt-1">{t('inventory.analysis.currentStock', 'Stoku Aktual')}: {selectedItem.current_stock} {selectedItem.unit}</p>
                                </div>
                                <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-hover rounded-lg text-text-muted transition-colors"><X size={20}/></button>
                            </div>
                            
                            <div className="p-5 min-h-[280px]">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
                                        <Loader2 size={40} className="animate-spin text-primary" />
                                        <p className="text-text-muted animate-pulse font-medium">{t('inventory.analysis.analyzing', 'Inteligjenca Artificiale po analizon...')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        <div className="bg-surface border border-primary/20 rounded-xl p-4 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                            <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2"><ShoppingCart size={14} /> {t('inventory.analysis.restockTitle', 'Sugjerim për Rimbushje')}</h4>
                                            <p className="text-sm text-text-secondary mb-3 leading-relaxed">
                                                {aiData.prediction?.reason || t('inventory.analysis.unavailable', 'Analiza momentalisht e padisponueshme.')}
                                            </p>
                                            <button 
                                                onClick={handleOpenDraftModal} 
                                                disabled={!aiData.prediction || aiData.prediction.suggested_quantity === 0} 
                                                className="w-full mt-2 py-2 btn-primary rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {t('inventory.analysis.draftOrder', 'Drafto Porosinë')} <ArrowRight size={14} />
                                            </button>
                                        </div>

                                        <div className="bg-surface border border-success-start/20 rounded-xl p-4 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-success-start" />
                                            <h4 className="text-sm font-bold text-success-start mb-2 flex items-center gap-2"><TrendingUp size={14} /> {t('inventory.analysis.trendTitle', 'Analiza e Trendit')}</h4>
                                            <p className="text-sm text-text-secondary">
                                                {aiData.trend?.trend_analysis || t('inventory.analysis.unavailable', 'Nuk ka të dhëna mjaftueshme shitjeje.')}
                                            </p>
                                            {aiData.trend?.cross_sell_opportunities && (
                                                <div className="mt-3 pt-2 border-t border-border-strong">
                                                    <p className="text-[10px] text-text-muted uppercase font-semibold mb-1">{t('inventory.analysis.crossSell', 'Mundësi Cross-Sell')}</p>
                                                    <p className="text-sm text-text-secondary">{aiData.trend.cross_sell_opportunities}</p>
                                                </div>
                                            )}
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
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-glass backdrop-blur-xl border border-primary/30 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden relative">
                            <div className="p-5 border-b border-border-strong">
                                <h3 className="text-lg font-bold text-text-primary">{t('inventory.poModal.title', 'Konfirmo Porosinë')}</h3>
                                <p className="text-sm text-text-muted">{t('inventory.poModal.subtitle', 'Verifikoni detajet para se të gjeneroni dokumentin final.')}</p>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-text-muted uppercase">{t('inventory.poModal.supplierName', 'Emri i Furnitorit')}</label>
                                    <textarea 
                                        value={poSupplier} 
                                        onChange={(e) => setPoSupplier(e.target.value)}
                                        className="glass-input w-full h-20 resize-none text-sm"
                                        placeholder={t('inventory.poModal.supplierPlaceholder', 'Shkruani emrin dhe adresën e furnitorit...')}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-text-muted uppercase">{t('inventory.poModal.quantity', 'Sasia')}</label>
                                        <input type="number" value={poQuantity} onChange={(e) => setPoQuantity(parseFloat(e.target.value) || 0)} className="glass-input w-full"/>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-text-muted uppercase">{t('inventory.poModal.totalCost', 'Kosto Totale')}</label>
                                        <input 
                                            type="number" 
                                            value={manualCost !== "" ? manualCost : calculatedCost.toFixed(2)}
                                            onChange={(e) => setManualCost(e.target.value)}
                                            placeholder={`Calculated: €${calculatedCost.toFixed(2)}`}
                                            className="glass-input w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 bg-surface/30 flex justify-end gap-3 border-t border-border-strong">
                                <button onClick={() => setShowPOModal(false)} className="btn-secondary px-5 py-2">{t('general.cancel')}</button>
                                <button 
                                    onClick={handleConfirmAndGeneratePO} 
                                    disabled={drafting} 
                                    className="btn-primary px-6 py-2 flex items-center gap-2 disabled:opacity-50"
                                >
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