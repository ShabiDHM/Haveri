// FILE: src/components/business/InventoryTab.tsx
// PHOENIX PROTOCOL - INVENTORY TAB V22.4 (RECIPE FEATURE EXTRACTED)

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2, FileSpreadsheet, Box, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { InventoryItem } from '../../data/types';

import { useInventoryData } from '../../hooks/useInventoryData';
import { InventoryList } from './inventory/InventoryList';
import { InventoryItemModal } from './modals/InventoryItemModal';
import { InventoryImportModal } from './modals/InventoryImportModal';
import { Panel } from '../ui/Panel';
import { useAuth } from '../../context/AuthContext';

const ActionButton = ({ icon, label, onClick, primary = false }: { icon: React.ReactNode, label: string, onClick: () => void, primary?: boolean }) => (
    <button 
        onClick={onClick} 
        className={`
            flex items-center justify-center text-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl text-sm sm:text-base font-bold transition-all duration-300 group w-full sm:w-auto hover-lift shadow-sm
            ${primary 
                ? 'btn-primary' 
                : 'glass-input !bg-surface hover:bg-hover transition-colors cursor-pointer border border-border-main'
            }
        `}
    >
        <span className={`transition-transform duration-300 group-hover:scale-110 ${primary ? '' : 'text-success-start'}`}>{icon}</span>
        <span className="truncate">{label}</span>
    </button>
);

export const InventoryTab: React.FC = () => {
    const { t } = useTranslation();
    const { workspace } = useAuth();
    
    const { 
        loading, manualItems, posItems, 
        loadData, deleteItem 
    } = useInventoryData(workspace?.id);

    const [searchTerm, setSearchTerm] = useState('');
    const [showItemModal, setShowItemModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false); 

    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

    const openCreateItem = () => { setEditingItem(null); setShowItemModal(true); };
    const openEditItem = (item: InventoryItem) => { setEditingItem(item); setShowItemModal(true); };
    const handleDeleteItem = async (id: string) => { if (window.confirm(t('general.confirmDelete'))) await deleteItem(id); };

    const filteredManual = manualItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredPos = posItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (loading) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-success-start" /></div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-6 md:p-8 space-y-6">
            <style>{`
                .custom-finance-scroll::-webkit-scrollbar { width: 6px; } 
                .custom-finance-scroll::-webkit-scrollbar-track { background: transparent; } 
                .custom-finance-scroll::-webkit-scrollbar-thumb { background: var(--status-success); border-radius: 10px; opacity: 0.3; } 
            `}</style>

            <Panel className="p-3 sm:p-4 border border-border-main bg-surface/30 backdrop-blur-sm shadow-sm">
                <div className="flex items-center gap-3 sm:gap-4">
                    <ActionButton primary icon={<Plus size={20} />} label={t('inventory.items.add')} onClick={openCreateItem} />
                    <ActionButton icon={<FileSpreadsheet size={20} />} label={t('inventory.items.import', 'Importo Artikujt')} onClick={() => setShowImportModal(true)} />
                </div>
            </Panel>

            <Panel className="p-4 sm:p-6 h-[700px] flex flex-col overflow-hidden border border-border-main bg-surface/30 backdrop-blur-sm shadow-sm">
                <div className="flex items-center justify-between gap-4 mb-6 pb-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight flex items-center gap-3">
                        <Box className="text-success-start" />
                        {t('inventory.title')}
                    </h2>
                </div>

                <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
                    <div className="relative group mb-4 shrink-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted group-focus-within:text-success-start transition-colors" />
                        <input 
                            type="text" 
                            placeholder={t('header.searchPlaceholder')} 
                            className="glass-input w-full pl-12 py-3 sm:py-4 text-sm sm:text-base border border-border-main focus:border-success-start transition-all" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto custom-finance-scroll pr-2 pb-2">
                        <InventoryList 
                            manualItems={filteredManual} 
                            posItems={filteredPos} 
                            onEdit={openEditItem} 
                            onDelete={handleDeleteItem} 
                        />
                    </div>
                </div>
            </Panel>

            <InventoryItemModal 
                isOpen={showItemModal} 
                onClose={() => setShowItemModal(false)} 
                onSuccess={loadData} 
                itemToEdit={editingItem} 
                onDelete={handleDeleteItem} 
            />
            
            <InventoryImportModal 
                isOpen={showImportModal} 
                onClose={() => setShowImportModal(false)} 
                onSuccess={loadData} 
                target="items"
                title={t('inventory.items.importTitle', 'Importo Artikujt e Inventarit')}
                requiredColumns="Emri, Njesia, Kosto, Stoku, LowStockThreshold"
            />
        </motion.div>
    );
};