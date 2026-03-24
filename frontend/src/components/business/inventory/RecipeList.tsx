// FILE: src/components/business/inventory/RecipeList.tsx
// PHOENIX PROTOCOL - RECIPE LIST V5.1 (EXECUTIVE DESIGN SYSTEM)
// UPDATED: Cards now use glass-panel with backdrop blur, consistent with other modules.
// ADDED: hover-lift and shadow-sm to cards and buttons.
// RETAINED: All functionality and logic.

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
            className="glass-panel border border-border-main rounded-3xl p-5 sm:p-6 hover-lift shadow-sm transition-all duration-300 group relative flex flex-col justify-between h-full min-h-[13rem]"
        >
            {/* Top Section */}
            <div>
                <div className="flex justify-between items-start gap-4 mb-3 sm:mb-4">
                    <div className="p-2.5 sm:p-3 rounded-2xl bg-surface/30 backdrop-blur-sm border border-border-main text-primary-start">
                        <ChefHat size={18} />
                    </div>
                </div>
                
                <h2 className="text-base sm:text-lg font-bold text-text-primary group-hover:text-text-primary line-clamp-2">{recipe.product_name}</h2>
                
                <div className="mt-3 space-y-2 max-h-24 overflow-y-auto no-scrollbar pr-1">
                    {recipe.ingredients.map((ing, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm text-text-secondary">
                            <span className="opacity-50">•</span>
                            <span>{getIngredientName(ing.inventory_item_id)}</span>
                            <span className="font-mono text-success-start">x{ing.quantity_required}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Bottom Section */}
            <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-border-main flex justify-between items-end">
                <div>
                    <span className="block text-xs sm:text-xs text-text-muted uppercase tracking-wider font-bold">
                        {t('inventory.recipes.cost', 'Kosto e Vlerësuar')}
                    </span>
                    <span className="text-lg sm:text-xl font-mono font-bold text-success-start">
                        €{calculateCost(recipe.ingredients).toFixed(2)}
                    </span>
                </div>
                
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => onEdit(recipe)} 
                        className="p-2 hover:bg-hover rounded-lg text-warning-start hover:text-warning-start/80 transition-colors hover-lift shadow-sm" 
                        title={t('general.edit')}
                    >
                        <Edit size={16} />
                    </button>
                    <button 
                        onClick={() => onDelete(recipe._id)} 
                        className="p-2 hover:bg-hover rounded-lg text-danger-start hover:text-danger-start/80 transition-colors hover-lift shadow-sm" 
                        title={t('general.delete')}
                    >
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
            <div className="flex flex-col items-center justify-center h-48 text-text-muted">
                <ChefHat size={40} className="mb-4 opacity-20" />
                <p className="text-sm sm:text-base">{t('inventory.recipes.noRecipes', 'No recipes found')}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
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
