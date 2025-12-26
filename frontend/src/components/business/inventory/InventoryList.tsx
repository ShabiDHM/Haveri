// FILE: src/components/business/inventory/InventoryList.tsx
// PHOENIX PROTOCOL - COMPONENT EXTRACTION V1.0
// Displays Manual and POS Inventory Items in Responsive Table/Cards.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Edit, Trash2, Layers, ChevronDown, ChevronUp } from 'lucide-react';
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

    // ROW RENDERER (Shared for lists)
    const renderRow = (item: InventoryItem) => (
        <tr key={item._id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
            <td className="px-4 py-3 text-white font-medium pl-8 sm:pl-4">{item.name}</td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="text-gray-300">{item.current_stock.toFixed(3)} {item.unit}</span>
                    {item.current_stock <= item.low_stock_threshold && (
                        <span title={t('inventory.lowStock')} className="flex items-center gap-1 bg-rose-500/10 text-rose-400 text-xs px-2 py-0.5 rounded-full"><AlertTriangle size={12} /></span>
                    )}
                </div>
            </td>
            <td className="px-4 py-3 text-emerald-400 font-mono">€{item.cost_per_unit.toFixed(2)}</td>
            <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                    <button onClick={() => onEdit(item)} className="p-1 text-gray-400 hover:text-amber-400"><Edit size={16} /></button>
                    <button onClick={() => onDelete(item._id)} className="p-1 text-gray-400 hover:text-rose-400"><Trash2 size={16} /></button>
                </div>
            </td>
        </tr>
    );

    // MOBILE CARD RENDERER
    const renderCard = (item: InventoryItem) => (
        <div key={item._id} className="flex flex-col p-4 bg-white/5 border border-white/10 rounded-xl mb-3">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <span className="text-white font-bold block text-lg">{item.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-400 text-sm">{item.current_stock.toFixed(3)} {item.unit}</span>
                        {item.current_stock <= item.low_stock_threshold && (
                            <span className="bg-rose-500/10 text-rose-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">{t('inventory.lowStock')}</span>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <span className="block text-emerald-400 font-mono font-bold">€{item.cost_per_unit.toFixed(2)}</span>
                    <span className="text-[10px] text-gray-500 uppercase">per {item.unit}</span>
                </div>
            </div>
            <div className="flex justify-end gap-4 mt-2 border-t border-white/5 pt-2">
                <button onClick={() => onEdit(item)} className="flex items-center gap-1 text-amber-400 text-sm"><Edit size={14} /> {t('general.edit')}</button>
                <button onClick={() => onDelete(item._id)} className="flex items-center gap-1 text-rose-400 text-sm"><Trash2 size={14} /> {t('general.delete')}</button>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* DESKTOP TABLE */}
            <div className="hidden sm:block bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('inventory.items.name')}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('inventory.items.stock')}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('inventory.cost')}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">{t('general.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {manualItems.map(renderRow)}
                        
                        {posItems.length > 0 && (
                            <>
                                <tr onClick={() => setExpandPosBatch(!expandPosBatch)} className="bg-black/30 cursor-pointer hover:bg-black/40 transition-colors border-t border-white/10">
                                    <td colSpan={4} className="px-4 py-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 rounded bg-purple-500/20 text-purple-400"><Layers size={16}/></div>
                                                <div>
                                                    <span className="font-bold text-white block text-sm">POS Inventory Batch</span>
                                                    <span className="text-xs text-gray-500">{posItems.length} imported items</span>
                                                </div>
                                            </div>
                                            {expandPosBatch ? <ChevronUp size={18} className="text-gray-500"/> : <ChevronDown size={18} className="text-gray-500"/>}
                                        </div>
                                    </td>
                                </tr>
                                <AnimatePresence>
                                    {expandPosBatch && (
                                        <>
                                            {posItems.map(item => (
                                                <motion.tr 
                                                    key={item._id}
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="bg-black/20"
                                                >
                                                    {/* Render row content wrapped in td to maintain table structure during animation */}
                                                    <td colSpan={4} className="p-0 border-b border-white/5">
                                                        <table className="w-full">
                                                            <tbody>{renderRow(item)}</tbody>
                                                        </table>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </>
                                    )}
                                </AnimatePresence>
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MOBILE LIST */}
            <div className="sm:hidden space-y-3">
                {manualItems.map(renderCard)}
                {posItems.length > 0 && (
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                        <div onClick={() => setExpandPosBatch(!expandPosBatch)} className="bg-black/30 p-4 flex items-center justify-between cursor-pointer">
                                <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded bg-purple-500/20 text-purple-400"><Layers size={16}/></div>
                                <div>
                                    <span className="font-bold text-white block text-sm">POS Batch</span>
                                    <span className="text-xs text-gray-500">{posItems.length} items</span>
                                </div>
                            </div>
                            {expandPosBatch ? <ChevronUp size={18} className="text-gray-500"/> : <ChevronDown size={18} className="text-gray-500"/>}
                        </div>
                        {expandPosBatch && (
                            <div className="bg-black/10 p-2 space-y-2">
                                {posItems.map(renderCard)}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {manualItems.length === 0 && posItems.length === 0 && (
                <div className="text-center py-10 text-gray-500 italic">{t('inventory.items.noItems')}</div>
            )}
        </div>
    );
};