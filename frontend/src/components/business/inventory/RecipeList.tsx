// FILE: src/components/business/inventory/RecipeList.tsx
// PHOENIX PROTOCOL - REPAIR V1.1
// Fixed potential export visibility issues.

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

    return (
        <>
            {/* Desktop Table */}
            <div className="hidden sm:block bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('inventory.recipes.productName')}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('inventory.recipes.ingredients')}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('inventory.recipes.estCost')}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">{t('general.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recipes.map(recipe => (
                            <tr key={recipe._id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3 text-white font-medium flex items-center gap-2">
                                    <ChefHat size={16} className="text-blue-400 shrink-0"/>{recipe.product_name}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                        {recipe.ingredients.map((ing, idx) => (
                                            <span key={idx} className="bg-black/20 text-gray-300 text-xs px-2 py-0.5 rounded-full border border-white/5">
                                                {getIngredientName(ing.inventory_item_id)}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-rose-400 font-mono">€{calculateCost(recipe.ingredients).toFixed(2)}</td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => onEdit(recipe)} className="p-1 text-gray-400 hover:text-amber-400"><Edit size={16} /></button>
                                        <button onClick={() => onDelete(recipe._id)} className="p-1 text-gray-400 hover:text-rose-400"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
                {recipes.map(recipe => (
                    <div key={recipe._id} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <ChefHat size={18} className="text-blue-400"/>
                                <h4 className="text-white font-bold">{recipe.product_name}</h4>
                            </div>
                            <span className="text-rose-400 font-mono font-bold">€{calculateCost(recipe.ingredients).toFixed(2)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-4">
                            {recipe.ingredients.map((ing, idx) => (
                                <span key={idx} className="bg-black/20 text-gray-300 text-[10px] px-2 py-1 rounded-md border border-white/5">
                                    {getIngredientName(ing.inventory_item_id)} ({ing.quantity_required})
                                </span>
                            ))}
                        </div>
                        <div className="flex justify-end gap-4 border-t border-white/5 pt-2">
                            <button onClick={() => onEdit(recipe)} className="flex items-center gap-1 text-amber-400 text-sm"><Edit size={14} /> {t('general.edit')}</button>
                            <button onClick={() => onDelete(recipe._id)} className="flex items-center gap-1 text-rose-400 text-sm"><Trash2 size={14} /> {t('general.delete')}</button>
                        </div>
                    </div>
                ))}
            </div>

            {recipes.length === 0 && <div className="text-center py-10 text-gray-500 italic">{t('inventory.recipes.noRecipes')}</div>}
        </>
    );
};