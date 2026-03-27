// FILE: src/components/business/InventoryTab.tsx
// PHOENIX PROTOCOL - INVENTORY TAB V22.3 (WORKSPACE FILTERING + COST CALC FIX)

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, ChefHat, Loader2, FileSpreadsheet, Box, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { InventoryItem, Recipe } from '../../data/types';

import { useInventoryData } from '../../hooks/useInventoryData';
import { InventoryList } from './inventory/InventoryList';
import { RecipeList } from './inventory/RecipeList';
import { InventoryItemModal } from './modals/InventoryItemModal';
import { RecipeModal } from './modals/RecipeModal';
import { InventoryImportModal } from './modals/InventoryImportModal';
import { Panel } from '../ui/Panel';
import { useAuth } from '../../context/AuthContext'; // ADDED

// --- TACTICAL UI COMPONENTS ---

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

const TabButton = ({ label, icon, isActive, onClick }: { label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void }) => (
    <button 
        onClick={onClick} 
        className={`
            flex-1 sm:flex-initial relative px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 hover-lift shadow-sm
            ${isActive 
                ? 'bg-success-start/20 text-success-start border border-success-start/30' 
                : 'text-text-muted hover:text-text-primary hover:bg-hover border border-border-main hover:border-success-start/30'
            }
        `}
    >
        <span className="relative z-10">{icon}</span>
        <span className="relative z-10">{label}</span>
    </button>
);

export const InventoryTab: React.FC = () => {
    const { t } = useTranslation();
    const { workspace } = useAuth(); // ADDED: get current workspace
    // Pass workspaceId to the hook
    const { 
        loading, items, recipes, manualItems, posItems, 
        loadData, deleteItem, deleteRecipe, 
        calculateIngredientCost   // use this for cost calculations
    } = useInventoryData(workspace?.id);

    const [activeTab, setActiveTab] = useState<'items' | 'recipes'>('items');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [showItemModal, setShowItemModal] = useState(false);
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false); 
    const [importTarget, setImportTarget] = useState<'items' | 'recipes'>('items');

    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

    const openCreateItem = () => { setEditingItem(null); setShowItemModal(true); };
    const openEditItem = (item: InventoryItem) => { setEditingItem(item); setShowItemModal(true); };
    const handleDeleteItem = async (id: string) => { if (window.confirm(t('general.confirmDelete'))) await deleteItem(id); };

    const openCreateRecipe = () => { setEditingRecipe(null); setShowRecipeModal(true); };
    const openEditRecipe = (recipe: Recipe) => { setEditingRecipe(recipe); setShowRecipeModal(true); };
    const handleDeleteRecipe = async (id: string) => { if (window.confirm(t('general.confirmDelete'))) await deleteRecipe(id); };

    const openImport = (target: 'items' | 'recipes') => { setImportTarget(target); setShowImportModal(true); };

    const filteredManual = manualItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredPos = posItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredRecipes = recipes.filter(r => r.product_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (loading) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-success-start" /></div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-6 md:p-8 space-y-6">
            <style>{`
                .custom-finance-scroll::-webkit-scrollbar { width: 6px; } 
                .custom-finance-scroll::-webkit-scrollbar-track { background: transparent; } 
                .custom-finance-scroll::-webkit-scrollbar-thumb { background: var(--status-success); border-radius: 10px; opacity: 0.3; } 
                .custom-finance-scroll::-webkit-scrollbar-thumb:hover { background: var(--status-success); opacity: 0.5; }
            `}</style>

            {/* Action Buttons Panel */}
            <Panel className="p-3 sm:p-4 border border-border-main bg-surface/30 backdrop-blur-sm shadow-sm">
                <div className="grid grid-cols-2 lg:flex lg:flex-wrap items-center gap-3 sm:gap-4">
                    {activeTab === 'items' ? (
                        <>
                            <ActionButton primary icon={<Plus size={20} />} label={t('inventory.items.add')} onClick={openCreateItem} />
                            <ActionButton icon={<FileSpreadsheet size={20} />} label={t('inventory.items.import', 'Importo Artikujt')} onClick={() => openImport('items')} />
                        </>
                    ) : (
                        <>
                            <ActionButton primary icon={<Plus size={20} />} label={t('inventory.recipes.add')} onClick={openCreateRecipe} />
                            <ActionButton icon={<FileSpreadsheet size={20} />} label={t('inventory.recipes.import')} onClick={() => openImport('recipes')} />
                        </>
                    )}
                </div>
            </Panel>

            {/* Main Content Panel */}
            <Panel className="p-4 sm:p-6 h-[700px] flex flex-col overflow-hidden border border-border-main bg-surface/30 backdrop-blur-sm shadow-sm">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 mb-6 pb-4 sm:pb-6 shrink-0">
                    <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight flex items-center gap-3">
                        <Box className="text-success-start" />
                        {t('inventory.title')}
                    </h2>
                    
                    {/* Tabs container */}
                    <div className="w-full md:w-auto flex bg-surface p-1.5 rounded-2xl backdrop-blur-md gap-1">
                        <TabButton label={t('inventory.tabItems', 'Artikujt')} icon={<Package size={16} />} isActive={activeTab === 'items'} onClick={() => setActiveTab('items')} />
                        <TabButton label={t('inventory.tabRecipes')} icon={<ChefHat size={16} />} isActive={activeTab === 'recipes'} onClick={() => setActiveTab('recipes')} />
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
                    <div className="relative group mb-4 shrink-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted group-focus-within:text-success-start transition-colors" />
                        <input 
                            type="text" 
                            placeholder={t('header.searchPlaceholder')} 
                            className="glass-input w-full pl-12 py-3 sm:py-4 text-sm sm:text-base border border-border-main focus:border-success-start focus:ring-1 focus:ring-success-start/40 transition-all" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto custom-finance-scroll pr-2 pb-2">
                        {activeTab === 'items' && (
                            <InventoryList 
                                manualItems={filteredManual} 
                                posItems={filteredPos} 
                                onEdit={openEditItem} 
                                onDelete={handleDeleteItem} 
                            />
                        )}

                        {activeTab === 'recipes' && (
                            <RecipeList 
                                recipes={filteredRecipes}
                                inventoryItems={items} 
                                calculateCost={calculateIngredientCost}   // FIXED: use calculateIngredientCost
                                onEdit={openEditRecipe}
                                onDelete={handleDeleteRecipe}
                            />
                        )}
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
            
            <RecipeModal 
                isOpen={showRecipeModal} 
                onClose={() => setShowRecipeModal(false)} 
                onSuccess={loadData} 
                recipeToEdit={editingRecipe} 
                inventoryItems={items} 
                calculateCost={calculateIngredientCost}   // FIXED: use calculateIngredientCost
            />
            
            <InventoryImportModal 
                isOpen={showImportModal} 
                onClose={() => setShowImportModal(false)} 
                onSuccess={loadData} 
                target={importTarget}
                title={importTarget === 'items' 
                    ? t('inventory.items.importTitle', 'Importo Artikujt e Inventarit') 
                    : t('inventory.recipes.importTitle', 'Importo Recetat')}
                requiredColumns={importTarget === 'items' 
                    ? "Emri, Njesia, Kosto, Stoku, LowStockThreshold" 
                    : "Product Name, Ingredient, Quantity"}
            />

        </motion.div>
    );
};