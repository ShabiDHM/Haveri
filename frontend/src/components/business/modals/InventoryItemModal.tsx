// FILE: src/components/business/modals/InventoryItemModal.tsx
// PHOENIX PROTOCOL - INVENTORY INTELLIGENCE V3.0
// 1. FEATURE: Surgically integrated AI Restock and Trend analysis.
// 2. LOGIC: Preserved existing form layout and Deletion Workflow V2.0.
// 3. STATUS: Synchronized with Backend Analysis API.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { InventoryItem, InventoryItemCreate, RestockPrediction, SalesTrendAnalysis } from '../../../data/types';
import { apiService } from '../../../services/api';
import { Trash2, ShoppingCart, TrendingUp, Loader2, ArrowRight, X } from 'lucide-react';

interface InventoryItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    itemToEdit: InventoryItem | null;
    onDelete: (id: string) => void;
}

export const InventoryItemModal: React.FC<InventoryItemModalProps> = ({ isOpen, onClose, onSuccess, itemToEdit, onDelete }) => {
    const { t } = useTranslation();
    
    // --- FORM STATE ---
    const [formData, setFormData] = useState<InventoryItemCreate>({ 
        name: '', 
        unit: 'kg', 
        current_stock: 0, 
        cost_per_unit: 0, 
        low_stock_threshold: 5 
    });

    // --- AI STATE ---
    const [restockData, setRestockData] = useState<RestockPrediction | null>(null);
    const [trendData, setTrendData] = useState<SalesTrendAnalysis | null>(null);
    const [loadingAI, setLoadingAI] = useState(false);

    // --- INITIALIZATION ---
    useEffect(() => {
        if (isOpen) {
            if (itemToEdit) {
                setFormData({
                    name: itemToEdit.name,
                    unit: itemToEdit.unit,
                    current_stock: itemToEdit.current_stock,
                    cost_per_unit: itemToEdit.cost_per_unit,
                    low_stock_threshold: itemToEdit.low_stock_threshold
                });
                // Trigger AI Fetch for existing items
                fetchAIInsights(itemToEdit._id);
            } else {
                setFormData({ name: '', unit: 'kg', current_stock: 0, cost_per_unit: 0, low_stock_threshold: 5 });
                setRestockData(null);
                setTrendData(null);
            }
        }
    }, [isOpen, itemToEdit]);

    const fetchAIInsights = async (id: string) => {
        setLoadingAI(true);
        try {
            const [restock, trend] = await Promise.all([
                apiService.predictRestock(id),
                apiService.analyzeSalesTrend(id)
            ]);
            setRestockData(restock);
            setTrendData(trend);
        } catch (err) {
            console.error("AI Insight Fetch Failed", err);
        } finally {
            setLoadingAI(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (itemToEdit) {
                await apiService.updateInventoryItem(itemToEdit._id, formData);
            } else {
                await apiService.createInventoryItem(formData);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert(t('error.generic'));
        }
    };
    
    const handleDelete = () => {
        if (itemToEdit) {
            onDelete(itemToEdit._id);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-background-dark border border-glass-edge rounded-2xl w-full max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto custom-finance-scroll">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                        {itemToEdit ? t('inventory.items.edit', 'Edit Item') : t('inventory.items.add')}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* --- AI INSIGHTS SECTION --- */}
                {itemToEdit && (
                    <div className="space-y-4 mb-8">
                        {loadingAI ? (
                            <div className="flex flex-col items-center py-4 gap-2 bg-white/5 rounded-xl border border-white/5">
                                <Loader2 className="animate-spin text-emerald-500" size={24} />
                                <span className="text-xs text-gray-500 animate-pulse">{t('finance.analyzing')}...</span>
                            </div>
                        ) : (
                            <>
                                {/* Restock Suggestion Card */}
                                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                                    <h4 className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-2">
                                        <ShoppingCart size={14} /> {t('inventory.ai.restockTitle', 'Sugjerim për Rimbushje')}
                                    </h4>
                                    <p className="text-sm text-gray-300 leading-relaxed">
                                        {restockData?.reason || t('inventory.ai.error', 'Analiza e padisponueshme.')}
                                    </p>
                                    {restockData && restockData.suggested_quantity > 0 && (
                                        <button type="button" className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all">
                                            {t('inventory.ai.draftOrder', 'Drafto Porosinë')} <ArrowRight size={14} />
                                        </button>
                                    )}
                                </div>

                                {/* Trend Analysis Card */}
                                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                                    <h4 className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-2">
                                        <TrendingUp size={14} /> {t('inventory.ai.trendTitle', 'Analiza e Trendit')}
                                    </h4>
                                    <div className="space-y-2">
                                        <p className="text-xs text-gray-500 font-bold uppercase">{t('inventory.ai.performance', 'Performance')}</p>
                                        <p className="text-sm text-gray-300">
                                            {trendData?.trend_analysis || t('inventory.ai.error', 'Analiza dështoi.')}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">{t('inventory.items.name')}</label>
                        <input required type="text" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-base sm:text-sm" 
                            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">{t('inventory.items.unit')}</label>
                            <select className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-base sm:text-sm appearance-none" 
                                value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}
                            >
                                <option value="kg">{t('units.kg', 'Kg')}</option>
                                <option value="litra">{t('units.liters', 'Litra')}</option>
                                <option value="cope">{t('units.pieces', 'Copë')}</option>
                                <option value="gr">{t('units.grams', 'Gram')}</option>
                                <option value="ml">{t('units.milliliters', 'Mililitra')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">{t('inventory.items.cost')}</label>
                            <input required type="number" step="0.01" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-base sm:text-sm" 
                                value={formData.cost_per_unit} onChange={e => setFormData({...formData, cost_per_unit: parseFloat(e.target.value) || 0})} 
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">{t('inventory.items.stock')}</label>
                            <input required type="number" step="0.001" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-base sm:text-sm" 
                                value={formData.current_stock} onChange={e => setFormData({...formData, current_stock: parseFloat(e.target.value) || 0})} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">{t('inventory.items.lowStock')}</label>
                            <input type="number" step="1" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-base sm:text-sm" 
                                value={formData.low_stock_threshold} onChange={e => setFormData({...formData, low_stock_threshold: parseFloat(e.target.value) || 0})} 
                            />
                        </div>
                    </div>
                    <div className="flex justify-between items-center gap-3 pt-4 border-t border-white/5">
                        <div>
                            {itemToEdit && (
                                <button type="button" onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-sm font-medium">
                                    <Trash2 size={16} />
                                    {t('general.delete', 'Delete')}
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">{t('general.cancel')}</button>
                            <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-900/20 transition-all">
                                {t('general.save')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};