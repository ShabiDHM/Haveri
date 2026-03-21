// FILE: src/components/business/inventory/InventoryList.tsx
// PHOENIX PROTOCOL - INVENTORY LIST V5.0 (UNIFIED ADMIN AESTHETIC)
// 1. LOGIC: Implemented automatic sorting. Items with LOWEST stock now appear at the top.
// 2. UX: This ensures critical items are seen first, as requested.
// 3. UPDATED: Uses unified border styling

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Edit, Trash2, Layers, Package, Box } from 'lucide-react';
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
    const isLowStock = current <= threshold;

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="group relative flex flex-col justify-between h-full min-h-[13rem] p-5 sm:p-6 rounded-3xl bg-surface/60 border border-border-strong hover:border-success-start/30 transition-all duration-300 shadow-sm"
        >
            {/* Top Section */}
            <div>
                <div className="flex justify-between items-start gap-4 mb-3 sm:mb-4">
                    <div className={`p-2.5 sm:p-3 rounded-2xl bg-surface border border-border-strong ${isPos ? 'text-primary' : 'text-success-start'}`}>
                        {isPos ? <Layers size={18} /> : <Package size={18} />}
                    </div>
                    {isLowStock && (
                        <div className="flex items-center gap-1.5 bg-danger/10 text-danger text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-bold animate-pulse">
                            <AlertTriangle size={12} /> {t('inventory.lowStock', 'Stoku Kritik')}
                        </div>
                    )}
                </div>
                
                <h2 className="text-base sm:text-lg font-bold text-text-primary group-hover:text-text-primary line-clamp-2">{item.name}</h2>
                
                <div className="mt-2 sm:mt-3">
                    <span className={`text-xl sm:text-2xl font-mono ${isLowStock ? 'text-danger' : 'text-text-primary'}`}>
                        {current.toFixed(3)}
                    </span>
                    <span className="ml-2 text-xs sm:text-sm text-text-muted">{item.unit}</span>
                </div>
            </div>
            
            {/* Bottom Section */}
            <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-border-strong flex justify-between items-end">
                <div>
                    <span className="block text-[10px] sm:text-xs text-text-muted uppercase tracking-wider font-bold">
                        {t('inventory.items.cost', 'Kosto / Njësi')}
                    </span>
                    <span className="text-lg sm:text-xl font-mono font-bold text-success-start">
                        €{item.cost_per_unit.toFixed(2)}
                    </span>
                </div>
                
                <div className="flex items-center gap-1">
                    <button onClick={() => onEdit(item)} className="p-2 hover:bg-hover rounded-lg text-warning-start hover:text-warning-start/80 transition-colors" title={t('general.edit')}>
                        <Edit size={16} />
                    </button>
                    <button onClick={() => onDelete(item._id)} className="p-2 hover:bg-hover rounded-lg text-danger hover:text-danger/80 transition-colors" title={t('general.delete')}>
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
        
        // Sort by Current Stock (Ascending) - Lowest stock first
        return combined.sort((a, b) => Number(a.current_stock) - Number(b.current_stock));
    }, [manualItems, posItems]);
    
    if (allItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-text-muted">
                <Box size={40} className="mb-4 opacity-20" />
                <p className="text-sm sm:text-base">{t('inventory.items.noItems', 'No items found')}</p>
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