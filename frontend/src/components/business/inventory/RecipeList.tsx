// FILE: src/components/business/inventory/RecipeList.tsx
// PHOENIX PROTOCOL - RECIPE LIST V3.0 (GRID LAYOUT)
// 1. LAYOUT: Replaced the vertical list with a responsive grid for better organization.
// 2. COMPONENT: Refactored the 'renderRecipeCard' into a dedicated card component with a vertical layout.
// 3. STYLE: Ensured card styles are consistent with the rest of the application.

import React from 'react';
import { ChefHat, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Recipe, InventoryItem, Ingredient } from '../../../data/types';
import { motion } from 'framer-motion';

interface RecipeListProps {
    recipes: Recipe[];
    inventoryItems: InventoryItem[];
    onEdit: (recipe: Recipe) => void;
    onDelete: (id: string) => void;
    calculateCost: (ingredients: Ingredient[]) => number;
}

const RecipeCard: React.FC<{
    recipe: Recipe;
    inventoryItems: InventoryItem[];
    onEdit: (recipe: Recipe) => void;
    onDelete: (id: string) => void;
    calculateCost: (ingredients: Ingredient[]) => number;
}> = ({ recipe, inventoryItems, onEdit, onDelete, calculateCost }) => {
    const { t } = useTranslation();
    const getIngredientName = (id: string) => inventoryItems.find(i => i._id === id)?.name || 'Unknown';

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="group relative flex flex-col justify-between h-full min-h-[14rem] p-6 rounded-3xl bg-gray-900/60 border border-white/10 hover:border-blue-500/30 transition-all duration-300"
        >
            {/* Top Section */}
            <div>
                <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-blue-400">
                        <ChefHat size={20} />
                    </div>
                    {/* Placeholder for future top-right icons if needed */}
                </div>
                
                <h2 className="text-lg font-bold text-gray-100 group-hover:text-white line-clamp-2">{recipe.product_name}</h2>
                
                <div className="mt-3 space-y-1.5 max-h-20 overflow-y-auto no-scrollbar pr-1">
                    {recipe.ingredients.map((ing, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="opacity-50">•</span>
                            <span>{getIngredientName(ing.inventory_item_id)}</span>
                            <span className="font-mono text-blue-400">x{ing.quantity_required}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Bottom Section */}
            <div className="pt-4 mt-4 border-t border-white/10 flex justify-between items-end">
                <div>
                    <span className="block text-[10px] text-gray-500 uppercase tracking-wider font-bold">{t('inventory.recipes.estCost')}</span>
                    <span className="text-xl font-mono font-bold text-rose-400">
                        €{calculateCost(recipe.ingredients).toFixed(2)}
                    </span>
                </div>
                
                <div className="flex items-center gap-1">
                    <button onClick={() => onEdit(recipe)} className="p-2 hover:bg-white/10 rounded-lg text-amber-400 hover:text-amber-300 transition-colors" title={t('general.edit')}>
                        <Edit size={16} />
                    </button>
                    <button onClick={() => onDelete(recipe._id)} className="p-2 hover:bg-white/10 rounded-lg text-rose-400 hover:text-rose-300 transition-colors" title={t('general.delete')}>
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};


export const RecipeList: React.FC<RecipeListProps> = ({ recipes, inventoryItems, onEdit, onDelete, calculateCost }) => {
    const { t } = useTranslation();

    if (recipes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <ChefHat size={48} className="mb-4 opacity-20" />
                <p>{t('inventory.recipes.noRecipes', 'No recipes found')}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map(recipe => (
                <RecipeCard 
                    key={recipe._id}
                    recipe={recipe}
                    inventoryItems={inventoryItems}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    calculateCost={calculateCost}
                />
            ))}
        </div>
    );
};