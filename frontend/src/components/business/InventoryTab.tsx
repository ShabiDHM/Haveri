// FILE: src/components/business/InventoryTab.tsx
// PHOENIX PROTOCOL - INVENTORY TAB V19.0 (TACTICAL UI)
// 1. VISUALS: Deepened background, improved action bar spacing.
// 2. LAYOUT: Switched to responsive container queries logic via CSS classes.

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, ChefHat, Loader2, FileSpreadsheet, Box, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { InventoryItem, Recipe } from '../../data/types';

// Modular Imports
import { useInventoryData } from '../../hooks/useInventoryData';
import { InventoryList } from './inventory/InventoryList';
import { RecipeList } from './inventory/RecipeList';
import { InventoryItemModal } from './modals/InventoryItemModal';
import { RecipeModal } from './modals/RecipeModal';
import { InventoryImportModal } from './modals/InventoryImportModal';

// --- TACTICAL UI COMPONENTS ---

const ActionButton = ({ icon, label, onClick, primary = false }: { icon: React.ReactNode, label: string, onClick: () => void, primary?: boolean }) => (
    <button 
        onClick={onClick} 
        className={`
            flex items-center justify-center text-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all duration-300 group
            ${primary 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/50' 
                : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 border border-white/10 hover:border-white/20'
            }
        `}
    >
        <span className={`transition-transform duration-300 group-hover:scale-110 ${primary ? 'text-white' : 'text-emerald-400'}`}>{icon}</span>
        <span>{label}</span>
    </button>
);

const TabButton = ({ label, icon, isActive, onClick }: { label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void }) => (
    <button 
        onClick={onClick} 
        className={`
            flex-1 sm:flex-initial relative px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2
            ${isActive 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }
        `}
    >
        <span className="relative z-10">{icon}</span>
        <span className="relative z-10 hidden sm:inline">{label}</span>
        <span className="relative z-10 sm:hidden">{label}</span>
    </button>
);

export const InventoryTab: React.FC = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'items' | 'recipes'>('items');
    const [searchTerm, setSearchTerm] = useState('');
    
    const { 
        loading, items, recipes, manualItems, posItems, 
        loadData, deleteItem, deleteRecipe, calculateRecipeCost 
    } = useInventoryData();

    // Modals
    const [showItemModal, setShowItemModal] = useState(false);
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false); 
    const [importTarget, setImportTarget] = useState<'items' | 'recipes'>('items');

    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

    // Handlers
    const openCreateItem = () => { setEditingItem(null); setShowItemModal(true); };
    const openEditItem = (item: InventoryItem) => { setEditingItem(item); setShowItemModal(true); };
    const handleDeleteItem = async (id: string) => { if (window.confirm(t('general.confirmDelete'))) await deleteItem(id); };

    const openCreateRecipe = () => { setEditingRecipe(null); setShowRecipeModal(true); };
    const openEditRecipe = (recipe: Recipe) => { setEditingRecipe(recipe); setShowRecipeModal(true); };
    const handleDeleteRecipe = async (id: string) => { if (window.confirm(t('general.confirmDelete'))) await deleteRecipe(id); };

    const openImport = (target: 'items' | 'recipes') => { setImportTarget(target); setShowImportModal(true); };

    // Filter Logic
    const filteredManual = manualItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredPos = posItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (loading) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-emerald-500" /></div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
             <style>{`
                .custom-finance-scroll::-webkit-scrollbar { width: 6px; } 
                .custom-finance-scroll::-webkit-scrollbar-track { background: transparent; } 
                .custom-finance-scroll::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.3); border-radius: 10px; } 
                .custom-finance-scroll::-webkit-scrollbar-thumb:hover { background: rgba(16,185,129,0.5); }
            `}</style>

            {/* DYNAMIC ACTION BAR */}
            <div className="grid grid-cols-2 lg:flex lg:flex-wrap items-center gap-4 bg-gray-900/40 p-4 rounded-3xl border border-white/5 backdrop-blur-md">
                {activeTab === 'items' ? (
                    <>
                        <ActionButton primary icon={<Plus size={20} />} label={t('inventory.items.add')} onClick={openCreateItem} />
                        <ActionButton icon={<FileSpreadsheet size={20} />} label={t('inventory.items.import', 'Import CSV')} onClick={() => openImport('items')} />
                    </>
                ) : (
                    <>
                         <ActionButton primary icon={<Plus size={20} />} label={t('inventory.recipes.add')} onClick={openCreateRecipe} />
                         <ActionButton icon={<FileSpreadsheet size={20} />} label={t('inventory.recipes.import')} onClick={() => openImport('recipes')} />
                    </>
                )}
            </div>

            {/* MAIN CONTENT CARD */}
            <div className="bg-gray-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-md min-h-[600px] flex flex-col shadow-2xl">
                
                {/* Header & Tabs */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 border-b border-white/5 pb-6">
                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        <Box className="text-emerald-500" />
                        {t('inventory.title')}
                    </h2>
                    
                    <div className="w-full sm:w-auto flex bg-black/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md gap-1">
                        <TabButton label={t('inventory.tabItems')} icon={<Package size={16} />} isActive={activeTab === 'items'} onClick={() => setActiveTab('items')} />
                        <TabButton label={t('inventory.tabRecipes')} icon={<ChefHat size={16} />} isActive={activeTab === 'recipes'} onClick={() => setActiveTab('recipes')} />
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative flex flex-col">
                    {/* Search Bar */}
                    <div className="relative group mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-emerald-400 transition-colors" />
                        <input 
                            type="text" 
                            placeholder={t('header.searchPlaceholder')} 
                            className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-base text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 transition-all shadow-inner" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'items' && (
                        <div className="flex-1 overflow-y-auto custom-finance-scroll pr-2">
                            <InventoryList 
                                manualItems={filteredManual} 
                                posItems={filteredPos} 
                                onEdit={openEditItem} 
                                onDelete={handleDeleteItem} 
                            />
                        </div>
                    )}

                    {activeTab === 'recipes' && (
                        <div className="flex-1 overflow-y-auto custom-finance-scroll pr-2">
                            <RecipeList 
                                recipes={recipes} 
                                inventoryItems={items} 
                                calculateCost={calculateRecipeCost}
                                onEdit={openEditRecipe}
                                onDelete={handleDeleteRecipe}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* MODALS */}
            <InventoryItemModal isOpen={showItemModal} onClose={() => setShowItemModal(false)} onSuccess={loadData} itemToEdit={editingItem} />
            <RecipeModal isOpen={showRecipeModal} onClose={() => setShowRecipeModal(false)} onSuccess={loadData} recipeToEdit={editingRecipe} inventoryItems={items} calculateCost={calculateRecipeCost} />
            <InventoryImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onSuccess={loadData} target={importTarget} />

        </motion.div>
    );
};