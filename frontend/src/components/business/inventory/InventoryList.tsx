// FILE: src/components/business/inventory/InventoryList.tsx
// PHOENIX PROTOCOL - INVENTORY LIST V2.0 (CARD HYBRID)
// 1. ARCHITECTURE: Removed <table>. Used Flex/Grid for responsive Card rows.
// 2. VISUALS: Consistent with Finance Transaction List.
// 3. LOGIC: Smooth expansion for POS batches.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Edit, Trash2, Layers, ChevronDown, ChevronRight, Package, Box } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { InventoryItem } from '../../../data/types';

interface InventoryListProps {
    manualItems: InventoryItem[];
    posItems: InventoryItem[];
    onEdit: (item: InventoryItem) => void;
    onDelete: (id: string) => void;
}

export const InventoryList: React.FC<InventoryListProps> = ({ manualItems, posItems, onEdit, onDelete }) => {
    const { t } = useTranslation();
    const [expandPosBatch, setExpandPosBatch] = useState(false);

    // UNIFIED CARD RENDERER
    const renderItemCard = (item: InventoryItem, isPos: boolean = false) => (
        <div key={item._id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/5 gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className={`p-2 sm:p-3 rounded-xl flex-shrink-0 ${isPos ? 'bg-purple-500/10 text-purple-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {isPos ? <Layers size={20} /> : <Package size={20} />}
                </div>
                <div className="min-w-0">
                    <h4 className="font-semibold text-white truncate text-sm sm:text-base">{item.name}</h4>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                        <span className={item.current_stock <= item.low_stock_threshold ? 'text-rose-400 font-bold' : 'text-gray-400'}>
                            {item.current_stock.toFixed(3)} {item.unit}
                        </span>
                        {item.current_stock <= item.low_stock_threshold && (
                             <span className="flex items-center gap-1 bg-rose-500/10 text-rose-400 text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                                <AlertTriangle size={10} /> {t('inventory.lowStock', 'Low')}
                             </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-row sm:items-center justify-between sm:justify-end gap-3 sm:gap-6 w-full sm:w-auto mt-1 sm:mt-0 pl-[52px] sm:pl-0">
                <span className="text-base sm:text-lg font-mono font-bold text-emerald-400">
                    €{item.cost_per_unit.toFixed(2)}
                </span>
                
                {/* Actions - Hidden on POS items usually, but kept for manual overrides if needed */}
                <div className="flex items-center gap-1 transition-opacity">
                    {!isPos && (
                        <>
                            <button onClick={() => onEdit(item)} className="p-2 hover:bg-white/10 rounded-lg text-amber-400 hover:text-amber-300 transition-colors" title={t('general.edit')}>
                                <Edit size={16} />
                            </button>
                            <button onClick={() => onDelete(item._id)} className="p-2 hover:bg-white/10 rounded-lg text-rose-400 hover:text-rose-300 transition-colors" title={t('general.delete')}>
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    if (manualItems.length === 0 && posItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Box size={48} className="mb-4 opacity-20" />
                <p>{t('inventory.items.noItems', 'No items in stock')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* MANUAL ITEMS LIST */}
            {manualItems.map(item => renderItemCard(item, false))}

            {/* POS BATCH GROUP */}
            {posItems.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden mt-4">
                    <div 
                        onClick={() => setExpandPosBatch(!expandPosBatch)}
                        className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 sm:p-3 rounded-xl bg-purple-500/10 text-purple-400">
                                <Layers size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm sm:text-base">{t('inventory.posBatch', 'POS Imported Batch')}</h4>
                                <p className="text-xs text-gray-500">{posItems.length} {t('inventory.itemsCount', 'items')}</p>
                            </div>
                        </div>
                        <div className="text-gray-400">
                            {expandPosBatch ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </div>

                    <AnimatePresence>
                        {expandPosBatch && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-white/10 bg-black/40 pl-4 sm:pl-8 py-2 space-y-2"
                            >
                                {posItems.map(item => renderItemCard(item, true))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};