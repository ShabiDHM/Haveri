// FILE: src/components/business/insights/StockModule.tsx
// PHOENIX PROTOCOL - STOCK MODULE V13.3 (HEIGHT ENFORCEMENT & SCROLLING)
// Fixed: Replaced text-[9px] with text-xs for consistency.
// FIXED: Added max-h-[300px] to stock list container to prevent card overflow

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, AlertCircle, TrendingUp, ShoppingCart, Loader2, X, ArrowRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../../services/api';
import { RestockPrediction, SalesTrendAnalysis } from '../../../data/types';

interface StockModuleProps {
    data: {
        totalStockValue: number;
        lowStockItems: any[];
    };
}

export const StockModule: React.FC<StockModuleProps> = ({ data }) => {
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
            <div className="glass-panel flex flex-col h-full min-h-[480px] p-6 sm:p-8 hover-lift relative overflow-hidden group shadow-sm border border-border-main">
                
                {/* Executive Header */}
                <div className="flex items-center gap-3 border-b border-border-main pb-5 mb-6 flex-shrink-0">
                    <Package className="text-primary-start" size={20} /> 
                    <h2 className="text-sm font-black text-text-primary uppercase tracking-widest leading-none">
                        {t('insights.inventory.title', 'Inteligjenca e Stokut')}
                    </h2>
                </div>
                
                <div className="flex flex-col flex-1 min-h-0">
                    {/* Main Value Box */}
                    <div className="glass-input p-5 mb-6 flex-shrink-0 border border-border-main bg-surface/30 backdrop-blur-sm">
                        <p className="text-xs text-text-muted uppercase font-black tracking-widest mb-2">
                            {t('insights.inventory.value', 'Vlera Totale e Stokut')}
                        </p>
                        <p className="text-2xl font-mono font-black text-text-primary">
                            €{totalStockValue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-text-muted mt-1 uppercase font-black tracking-widest">
                            {t('insights.inventory.valueDesc', 'Para të bllokuara në rafte')}
                        </p>
                    </div>

                    {/* Critical Stock List Header */}
                    <div className="flex justify-between items-center mb-3 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${hasLowStock ? 'bg-warning-start' : 'bg-success-start'}`}></div>
                            <h3 className="text-xs text-text-muted uppercase font-black tracking-widest">
                                {t('inventory.lowStock', 'Stoku Kritik')}
                            </h3>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded font-black uppercase tracking-widest border ${hasLowStock ? 'bg-warning-start/10 text-warning-start border-warning-start/20' : 'bg-success-start/10 text-success-start border-success-start/20'}`}>
                            {lowStockItems.length} {t('inventory.itemsCount', 'Artikuj')}
                        </span>
                    </div>

                    {/* List Area - FIXED: Added max-h-[300px] to enforce consistent card height */}
                    <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 custom-scrollbar pr-2">
                        {lowStockItems.length === 0 ? (
                            <div className="glass-input p-6 flex items-center justify-center text-center border border-border-main bg-surface/30 backdrop-blur-sm">
                                <p className="text-xs text-text-muted uppercase font-black tracking-widest">
                                    {t('general.allGood', 'Gjithçka në rregull!')}
                                </p>
                            </div>
                        ) : (
                            lowStockItems.map((item: any, idx: number) => (
                                <div 
                                    key={idx} 
                                    onClick={() => handleItemClick(item)} 
                                    className="glass-input p-4 flex justify-between items-center group hover:border-warning-start/30 transition-all cursor-pointer hover-lift border border-border-main bg-surface/30 backdrop-blur-sm"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                                        <div className="text-warning-start/70 group-hover:text-warning-start transition-colors shrink-0">
                                            <Zap size={14} />
                                        </div>
                                        <span className="text-xs font-bold text-text-primary truncate">
                                            {item.name}
                                        </span>
                                    </div>
                                    <span className="text-xs font-mono font-black text-warning-start flex items-center gap-1.5 shrink-0 ml-3">
                                        <AlertCircle size={12} /> {item.current_stock} {item.unit}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* AI Analysis Modal */}
            <AnimatePresence>
                {selectedItem && !showPOModal && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-canvas/80 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.98, y: 20 }} 
                            animate={{ scale: 1, y: 0 }} 
                            exit={{ scale: 0.98, y: 20 }} 
                            className="glass-panel w-full max-w-lg shadow-sm overflow-hidden relative border border-border-main"
                        >
                            <div className="p-6 sm:p-8 border-b border-border-main flex justify-between items-start">
                                <div>
                                    <h3 className="text-sm font-black text-text-primary uppercase tracking-widest flex items-center gap-3 mb-2">
                                        {selectedItem.name}
                                        <span className="text-xs bg-danger-start/10 border border-danger-start/20 text-danger-start px-2 py-0.5 rounded uppercase font-black tracking-widest">
                                            {t('inventory.analysis.critical', 'Kritike')}
                                        </span>
                                    </h3>
                                    <p className="text-xs text-text-muted uppercase font-black tracking-widest">
                                        {t('inventory.analysis.currentStock', 'Stoku Aktual')}: {selectedItem.current_stock} {selectedItem.unit}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-hover rounded-lg text-text-muted transition-colors hover-lift">
                                    <X size={20}/>
                                </button>
                            </div>
                            
                            <div className="p-6 sm:p-8 min-h-[280px]">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                                        <Loader2 size={32} className="animate-spin text-primary-start" />
                                        <p className="text-xs text-text-muted uppercase font-black tracking-widest animate-pulse">
                                            {t('inventory.analysis.analyzing', 'Inteligjenca Artificiale po analizon...')}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="glass-input p-5 relative overflow-hidden border border-border-main bg-surface/30 backdrop-blur-sm">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-primary-start" />
                                            <h4 className="text-xs font-black text-primary-start uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <ShoppingCart size={14} /> {t('inventory.analysis.restockTitle', 'Sugjerim për Rimbushje')}
                                            </h4>
                                            <p className="text-xs text-text-secondary mb-4 leading-relaxed font-medium">
                                                {aiData.prediction?.reason || t('inventory.analysis.unavailable', 'Analiza momentalisht e padisponueshme.')}
                                            </p>
                                            <button 
                                                onClick={handleOpenDraftModal} 
                                                disabled={!aiData.prediction || aiData.prediction.suggested_quantity === 0} 
                                                className="w-full h-12 btn-primary rounded-lg text-xs uppercase font-black tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 hover-lift shadow-sm"
                                            >
                                                {t('inventory.analysis.draftOrder', 'Drafto Porosinë')} <ArrowRight size={14} />
                                            </button>
                                        </div>

                                        <div className="glass-input p-5 relative overflow-hidden border border-border-main bg-surface/30 backdrop-blur-sm">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-success-start" />
                                            <h4 className="text-xs font-black text-success-start uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <TrendingUp size={14} /> {t('inventory.analysis.trendTitle', 'Analiza e Trendit')}
                                            </h4>
                                            <p className="text-xs text-text-secondary font-medium leading-relaxed">
                                                {aiData.trend?.trend_analysis || t('inventory.analysis.unavailable', 'Nuk ka të dhëna mjaftueshme shitjeje.')}
                                            </p>
                                            {aiData.trend?.cross_sell_opportunities && (
                                                <div className="mt-4 pt-4 border-t border-border-main">
                                                    <p className="text-xs text-text-muted uppercase font-black tracking-widest mb-2">
                                                        {t('inventory.analysis.crossSell', 'Mundësi për Shitje të Kryqëzuar')}
                                                    </p>
                                                    <p className="text-xs text-text-secondary font-medium leading-relaxed">
                                                        {aiData.trend.cross_sell_opportunities}
                                                    </p>
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

            {/* PO Generation Modal */}
            <AnimatePresence>
                {showPOModal && selectedItem && (
                     <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-canvas/80 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.98, y: 20 }} 
                            animate={{ scale: 1, y: 0 }} 
                            exit={{ scale: 0.98, y: 20 }} 
                            className="glass-panel w-full max-w-lg shadow-sm overflow-hidden relative border border-border-main"
                        >
                            <div className="p-6 sm:p-8 border-b border-border-main">
                                <h3 className="text-sm font-black text-text-primary uppercase tracking-widest mb-2">
                                    {t('inventory.poModal.title', 'Konfirmo Porosinë')}
                                </h3>
                                <p className="text-xs text-text-muted uppercase font-black tracking-widest">
                                    {t('inventory.poModal.subtitle', 'Verifikoni detajet para se të gjeneroni dokumentin final.')}
                                </p>
                            </div>
                            
                            <div className="p-6 sm:p-8 space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-2">
                                        {t('inventory.poModal.supplierName', 'Emri i Furnitorit')}
                                    </label>
                                    <textarea 
                                        value={poSupplier} 
                                        onChange={(e) => setPoSupplier(e.target.value)}
                                        className="glass-input w-full p-4 h-24 resize-none text-sm placeholder:text-text-muted border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all"
                                        placeholder={t('inventory.poModal.supplierPlaceholder', 'Shkruani emrin dhe adresën e furnitorit...')}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-2">
                                            {t('inventory.poModal.quantity', 'Sasia')}
                                        </label>
                                        <input 
                                            type="number" 
                                            value={poQuantity} 
                                            onChange={(e) => setPoQuantity(parseFloat(e.target.value) || 0)} 
                                            className="glass-input w-full p-4 text-sm border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-2">
                                            {t('inventory.poModal.totalCost', 'Kosto Totale')}
                                        </label>
                                        <input 
                                            type="number" 
                                            value={manualCost !== "" ? manualCost : calculatedCost.toFixed(2)}
                                            onChange={(e) => setManualCost(e.target.value)}
                                            placeholder={`Calculated: €${calculatedCost.toFixed(2)}`}
                                            className="glass-input w-full p-4 text-sm font-mono border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 sm:p-8 border-t border-border-main flex justify-end gap-3 bg-surface/20 backdrop-blur-sm">
                                <button 
                                    onClick={() => setShowPOModal(false)} 
                                    className="px-6 h-12 rounded-lg text-xs uppercase font-black tracking-widest text-text-muted hover:text-text-primary hover:bg-hover transition-colors hover-lift shadow-sm"
                                >
                                    {t('general.cancel', 'Anulo')}
                                </button>
                                <button 
                                    onClick={handleConfirmAndGeneratePO} 
                                    disabled={drafting} 
                                    className="btn-primary px-6 h-12 rounded-lg flex items-center justify-center gap-2 disabled:opacity-40 hover-lift shadow-sm"
                                >
                                    {drafting ? <Loader2 size={16} className="animate-spin"/> : null}
                                    <span className="text-xs uppercase font-black tracking-widest">
                                        {t('inventory.poModal.generatePDF', 'Gjenero PDF')}
                                    </span>
                                </button>
                            </div>
                        </motion.div>
                     </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};