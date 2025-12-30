// FILE: src/components/business/inventory/RecipeList.tsx
// PHOENIX PROTOCOL - RECIPE LIST V2.1 (CLEANUP)
// 1. FIX: Removed unused 'Box' import.
// 2. STATUS: Clean and warning-free.

import React from 'react';
import { ChefHat, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Recipe, InventoryItem, Ingredient } from '../../../data/types';

interface RecipeListProps {
    recipes: Recipe[];
    inventoryItems: InventoryItem[];
    onEdit: (recipe: Recipe) => void;
    onDelete: (id: string) => void;
    calculateCost: (ingredients: Ingredient[]) => number;
}

export const RecipeList: React.FC<RecipeListProps> = ({ recipes, inventoryItems, onEdit, onDelete, calculateCost }) => {
    const { t } = useTranslation();

    const getIngredientName = (id: string) => {
        const item = inventoryItems.find(i => i._id === id);
        return item ? item.name : 'Unknown';
    };

    // UNIFIED CARD RENDERER
    const renderRecipeCard = (recipe: Recipe) => (
        <div key={recipe._id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/5 gap-3">
            
            {/* Left Side: Icon & Info */}
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="p-2 sm:p-3 rounded-xl flex-shrink-0 bg-blue-500/10 text-blue-400">
                    <ChefHat size={20} />
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-white truncate text-sm sm:text-base">{recipe.product_name}</h4>
                    
                    {/* Ingredients Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {recipe.ingredients.map((ing, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md bg-black/30 border border-white/5 text-[10px] sm:text-xs text-gray-400">
                                {getIngredientName(ing.inventory_item_id)} 
                                <span className="text-blue-400 ml-1 font-mono">x{ing.quantity_required}</span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side: Cost & Actions */}
            <div className="flex flex-row sm:items-center justify-between sm:justify-end gap-3 sm:gap-6 w-full sm:w-auto mt-2 sm:mt-0 pl-[52px] sm:pl-0">
                <div className="text-left sm:text-right">
                    <span className="block text-xs text-gray-500 uppercase tracking-wider">{t('inventory.recipes.estCost')}</span>
                    <span className="text-base sm:text-lg font-mono font-bold text-rose-400">
                        €{calculateCost(recipe.ingredients).toFixed(2)}
                    </span>
                </div>
                
                <div className="flex items-center gap-1 opacity-100 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(recipe)} className="p-2 hover:bg-white/10 rounded-lg text-amber-400 hover:text-amber-300 transition-colors" title={t('general.edit')}>
                        <Edit size={16} />
                    </button>
                    <button onClick={() => onDelete(recipe._id)} className="p-2 hover:bg-white/10 rounded-lg text-rose-400 hover:text-rose-300 transition-colors" title={t('general.delete')}>
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );

    if (recipes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <ChefHat size={48} className="mb-4 opacity-20" />
                <p>{t('inventory.recipes.noRecipes', 'No recipes found')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {recipes.map(renderRecipeCard)}
        </div>
    );
};