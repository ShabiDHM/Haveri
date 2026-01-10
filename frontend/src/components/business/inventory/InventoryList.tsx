// FILE: src/components/business/inventory/InventoryList.tsx
// PHOENIX PROTOCOL - INVENTORY LIST V3.1 (UI/UX ALIGNMENT)
// 1. STYLE: Matched the 'ItemCard' styling (font sizes, spacing, layout) to the 'RecipeCard'.
// 2. READABILITY: Increased text size for better readability and visual consistency.
// 3. INTEGRITY: Preserved all existing functionality.

import React from 'react';
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
    const isLowStock = item.current_stock <= item.low_stock_threshold;

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="group relative flex flex-col justify-between h-full min-h-[14rem] p-6 rounded-3xl bg-gray-900/60 border border-white/10 hover:border-emerald-500/30 transition-all duration-300"
        >
            {/* Top Section */}
            <div>
                <div className="flex justify-between items-start gap-4 mb-4">
                    <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 ${isPos ? 'text-purple-400' : 'text-emerald-400'}`}>
                        {isPos ? <Layers size={20} /> : <Package size={20} />}
                    </div>
                    {isLowStock && (
                        <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-bold">
                            <AlertTriangle size={12} /> {t('inventory.lowStock', 'Stoku Kritik')}
                        </div>
                    )}
                </div>
                
                {/* PHOENIX: Matched RecipeCard font size and spacing */}
                <h2 className="text-lg font-bold text-gray-100 group-hover:text-white line-clamp-2">{item.name}</h2>
                
                <div className="mt-3">
                    <span className={`text-2xl font-mono ${isLowStock ? 'text-rose-400' : 'text-gray-200'}`}>
                        {item.current_stock.toFixed(3)}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">{item.unit}</span>
                </div>
            </div>
            
            {/* Bottom Section */}
            <div className="pt-4 mt-4 border-t border-white/10 flex justify-between items-end">
                <div>
                    <span className="block text-[10px] text-gray-500 uppercase tracking-wider font-bold">{t('inventory.items.costPerUnit')}</span>
                    {/* PHOENIX: Matched RecipeCard font size */}
                    <span className="text-xl font-mono font-bold text-emerald-400">
                        €{item.cost_per_unit.toFixed(2)}
                    </span>
                </div>
                
                <div className="flex items-center gap-1">
                    <button onClick={() => onEdit(item)} className="p-2 hover:bg-white/10 rounded-lg text-amber-400 hover:text-amber-300 transition-colors" title={t('general.edit')}>
                        <Edit size={16} />
                    </button>
                    <button onClick={() => onDelete(item._id)} className="p-2 hover:bg-white/10 rounded-lg text-rose-400 hover:text-rose-300 transition-colors" title={t('general.delete')}>
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export const InventoryList: React.FC<InventoryListProps> = ({ manualItems, posItems, onEdit, onDelete }) => {
    const { t } = useTranslation();

    const allItems = [...manualItems.map(item => ({...item, isPos: false})), ...posItems.map(item => ({...item, isPos: true}))];
    
    if (allItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Box size={48} className="mb-4 opacity-20" />
                <p>{t('inventory.items.noItems', 'No items in stock')}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
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