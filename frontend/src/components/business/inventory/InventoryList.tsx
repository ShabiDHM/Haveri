// FILE: src/components/business/inventory/InventoryList.tsx
// PHOENIX PROTOCOL - INVENTORY LIST V6.3 (ATMOSPHERIC GLASS CARDS)

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
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 hover:border-white/20 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.1)] group flex flex-col justify-between h-full min-h-[13rem]"
        >
            {/* Dynamic Status Accent Line */}
            <div className={`absolute bottom-0 left-0 w-full h-1 ${isCritical ? 'bg-rose-500' : 'bg-indigo-500'}`} />
            
            <div>
                <div className="flex justify-between items-start gap-4 mb-3 sm:mb-4">
                    <div className={`p-2.5 sm:p-3 rounded-xl bg-white/5 border border-white/10 ${isPos ? 'text-indigo-400' : 'text-emerald-400'}`}>
                        {isPos ? <Layers size={18} /> : <Package size={18} />}
                    </div>
                    {isCritical && (
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {t('inventory.lowStock', 'Stoku Kritik')}
                        </span>
                    )}
                </div>
                
                <h4 className="text-white font-bold text-base sm:text-lg mb-1 line-clamp-2">{item.name}</h4>
                
                <div className="mt-2 sm:mt-3">
                    <span className={`text-xl sm:text-2xl font-mono font-bold ${isCritical ? 'text-rose-400' : 'text-white'}`}>
                        {current.toFixed(3)}
                    </span>
                    <span className="ml-2 text-xs sm:text-sm text-white/50">{item.unit}</span>
                </div>
            </div>
            
            <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-white/10 flex justify-between items-end">
                <div>
                    <span className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold">
                        {t('inventory.items.cost', 'Kosto / Njësi')}
                    </span>
                    <span className="text-lg sm:text-xl font-mono font-bold text-emerald-400">
                        €{item.cost_per_unit.toFixed(2)}
                    </span>
                </div>
                
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => onEdit(item)} 
                        className="p-2 hover:bg-white/10 rounded-lg text-amber-400 hover:text-amber-300 transition-colors hover-lift shadow-sm" 
                        title={t('general.edit')}
                    >
                        <Edit size={16} />
                    </button>
                    <button 
                        onClick={() => onDelete(item._id)} 
                        className="p-2 hover:bg-white/10 rounded-lg text-rose-400 hover:text-rose-300 transition-colors hover-lift shadow-sm" 
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
            <div className="flex flex-col items-center justify-center h-48 text-white/50">
                <Box size={40} className="mb-4 opacity-20" />
                <p className="text-sm sm:text-base">
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