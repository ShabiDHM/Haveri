// FILE: src/components/business/inventory/InventoryList.tsx
// PHOENIX PROTOCOL - INVENTORY CARD RECONCILIATION V12.0
// 1. FIX: Removed all hardcoded dark opacities (!bg-black/20).
// 2. FIX: Implemented theme-aware contrast for costs and stock levels.
// 3. FIX: Integrated 'group' hover effects and CSS variable alignment.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Edit, Trash2, Layers, Package, Box } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { InventoryItem } from '../../../data/types';

interface InventoryListProps {
    manualItems: InventoryItem[];
    posItems: InventoryItem[];
    onEdit: (item: InventoryItem) => void;
    onDelete: (id: string) => void;
}

const ItemCard: React.FC<{
    item: InventoryItem;
    isPos: boolean;
    onEdit: (item: InventoryItem) => void;
    onDelete: (id: string) => void;
}> = ({ item, isPos, onEdit, onDelete }) => {
    const { t } = useTranslation();
    const current = Number(item.current_stock);
    const threshold = Number(item.low_stock_threshold || 0);
    const isCritical = current <= threshold;

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-5 transition-all duration-300 hover:shadow-md group flex flex-col justify-between h-full min-h-[14rem]"
        >
            {/* Accent Bar - High Contrast Theme Aware */}
            <div className={`absolute bottom-0 left-0 w-full h-1.5 transition-colors ${isCritical ? 'bg-rose-500' : 'bg-emerald-500'}`} />
            
            <div>
                <div className="flex justify-between items-start mb-4">
                    <div className="rounded-xl bg-[var(--bg-input)] p-3 text-[var(--text-muted)] group-hover:text-emerald-500 group-hover:scale-110 transition-all duration-500">
                        {isPos ? <Layers size={18} /> : <Package size={18} />}
                    </div>
                    {isCritical && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            Stoku Kritik
                        </span>
                    )}
                </div>
                
                <h4 className="text-[var(--text-primary)] font-bold text-base sm:text-lg mb-2 line-clamp-2 tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {item.name}
                </h4>
                
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-mono font-black text-[var(--text-primary)]">
                        {current.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                        {item.unit || 'cope'}
                    </span>
                </div>
            </div>
            
            <div className="pt-4 mt-4 border-t border-[var(--border-main)] flex justify-between items-center">
                <div>
                    <span className="block text-[9px] text-[var(--text-disabled)] uppercase tracking-[0.2em] font-black mb-1">
                        {t('inventory.items.cost', 'Kosto / Njësi')}
                    </span>
                    <span className="text-base sm:text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        €{item.cost_per_unit.toFixed(2)}
                    </span>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button 
                        onClick={() => onEdit(item)} 
                        className="p-2 hover:bg-amber-500/10 rounded-lg text-[var(--text-muted)] hover:text-amber-500 transition-all" 
                        title={t('general.edit')}
                    >
                        <Edit size={16} />
                    </button>
                    <button 
                        onClick={() => onDelete(item._id)} 
                        className="p-2 hover:bg-rose-500/10 rounded-lg text-[var(--text-muted)] hover:text-rose-500 transition-all" 
                        title={t('general.delete')}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export const InventoryList: React.FC<InventoryListProps> = ({ manualItems, posItems, onEdit, onDelete }) => {
    const { t } = useTranslation();

    const allItems = useMemo(() => {
        const combined = [
            ...manualItems.map(item => ({...item, isPos: false})), 
            ...posItems.map(item => ({...item, isPos: true}))
        ];
        return combined.sort((a, b) => Number(a.current_stock) - Number(b.current_stock));
    }, [manualItems, posItems]);
    
    if (allItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)] border-2 border-dashed border-[var(--border-main)] rounded-[2rem]">
                <Box size={48} className="mb-4 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">
                    {t('inventory.items.noItemsFound', 'Nuk u gjet asnjë artikull.')}
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
            {allItems.map(item => (
                <ItemCard 
                    key={item._id}
                    item={item}
                    isPos={item.isPos}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
};

