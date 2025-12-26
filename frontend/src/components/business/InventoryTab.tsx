// FILE: src/components/business/InventoryTab.tsx
// PHOENIX PROTOCOL - SYNC V1.2
// Verified import paths for Modals and Hooks.

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, ChefHat, Loader2, FileSpreadsheet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { InventoryItem, Recipe } from '../../data/types';

// Modular Imports - Verified Paths
import { useInventoryData } from '../../hooks/useInventoryData';
import { InventoryList } from './inventory/InventoryList';
import { RecipeList } from './inventory/RecipeList';
import { InventoryItemModal } from './modals/InventoryItemModal';
import { RecipeModal } from './modals/RecipeModal';
import { InventoryImportModal } from './modals/InventoryImportModal';

// Sub-component for Tab Buttons
const TabButton = ({ label, icon, isActive, onClick }: any) => (
    <button 
        onClick={onClick} 
        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${isActive ? 'bg-secondary-start/10 text-secondary-start border border-secondary-start/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
    >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{label.split(' ')[0]}</span>
    </button>
);

export const InventoryTab: React.FC = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'items' | 'recipes'>('items');
    
    // Custom Hook
    const { 
        loading, items, recipes, manualItems, posItems, 
        loadData, deleteItem, deleteRecipe, calculateRecipeCost 
    } = useInventoryData();

    // Modals State
    const [showItemModal, setShowItemModal] = useState(false);
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false); 
    const [importTarget, setImportTarget] = useState<'items' | 'recipes'>('items');

    // Edit State
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

    if (loading) return <div className="flex justify-center h-64 items-center"><Loader2 className="animate-spin text-secondary-start" /></div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 h-full flex flex-col">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 flex-none">
                <h2 className="text-xl font-bold text-white">{t('inventory.title')}</h2>
                <div className="flex gap-2 bg-black/20 p-1 rounded-lg self-start sm:self-auto">
                    <TabButton label={t('inventory.tabItems')} icon={<Package size={16} />} isActive={activeTab === 'items'} onClick={() => setActiveTab('items')} />
                    <TabButton label={t('inventory.tabRecipes')} icon={<ChefHat size={16} />} isActive={activeTab === 'recipes'} onClick={() => setActiveTab('recipes')} />
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-0 sm:pr-2">
                {activeTab === 'items' && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
                            <button onClick={() => openImport('items')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg font-medium transition-colors text-xs sm:text-sm">
                                <FileSpreadsheet size={16} className="text-emerald-400" /> 
                                <span className="whitespace-nowrap">{t('inventory.items.import', 'Import CSV')}</span>
                            </button>
                            <button onClick={openCreateItem} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors text-xs sm:text-sm whitespace-nowrap">
                                <Plus size={16} /> {t('inventory.items.add')}
                            </button>
                        </div>
                        
                        <InventoryList 
                            manualItems={manualItems} 
                            posItems={posItems} 
                            onEdit={openEditItem} 
                            onDelete={handleDeleteItem} 
                        />
                    </div>
                )}

                {activeTab === 'recipes' && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
                            <button onClick={() => openImport('recipes')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg font-medium transition-colors text-xs sm:text-sm">
                                <FileSpreadsheet size={16} className="text-green-400" /> 
                                <span className="whitespace-nowrap">{t('inventory.recipes.import')}</span>
                            </button>
                            <button onClick={openCreateRecipe} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors text-xs sm:text-sm whitespace-nowrap">
                                <Plus size={16} /> {t('inventory.recipes.add')}
                            </button>
                        </div>

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

            {/* MODALS */}
            <InventoryItemModal 
                isOpen={showItemModal} 
                onClose={() => setShowItemModal(false)} 
                onSuccess={loadData} 
                itemToEdit={editingItem} 
            />

            <RecipeModal 
                isOpen={showRecipeModal} 
                onClose={() => setShowRecipeModal(false)} 
                onSuccess={loadData} 
                recipeToEdit={editingRecipe} 
                inventoryItems={items} 
                calculateCost={calculateRecipeCost} 
            />

            <InventoryImportModal 
                isOpen={showImportModal} 
                onClose={() => setShowImportModal(false)} 
                onSuccess={loadData} 
                target={importTarget} 
            />

        </motion.div>
    );
};