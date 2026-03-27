// FILE: src/hooks/useInventoryData.ts
// PHOENIX PROTOCOL - INVENTORY DATA HOOK V2.2 (INGREDIENT COST FUNCTION)

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { InventoryItem, Recipe, Ingredient } from '../data/types';

export const useInventoryData = (workspaceId?: string) => {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [fetchedItems, fetchedRecipes] = await Promise.all([
                apiService.getInventoryItems(workspaceId),
                apiService.getRecipes(workspaceId)
            ]);
            setItems(fetchedItems);
            setRecipes(fetchedRecipes);
        } catch (error) {
            console.error("Failed to load inventory data:", error);
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const deleteItem = async (id: string) => {
        try {
            await apiService.deleteInventoryItem(id);
            await loadData();
        } catch (error) {
            console.error("Failed to delete item:", error);
        }
    };

    const deleteRecipe = async (id: string) => {
        try {
            await apiService.deleteRecipe(id);
            await loadData();
        } catch (error) {
            console.error("Failed to delete recipe:", error);
        }
    };

    // NEW: Calculate cost from a list of ingredients (used by RecipeList and RecipeModal)
    const calculateIngredientCost = (ingredients: Ingredient[]): number => {
        let total = 0;
        for (const ing of ingredients) {
            const item = items.find(i => i._id === ing.inventory_item_id);
            if (item) total += item.cost_per_unit * ing.quantity_required;
        }
        return total;
    };

    // Legacy: calculate cost from a full recipe (kept for compatibility)
    const calculateRecipeCost = (recipe: Recipe): number => {
        return calculateIngredientCost(recipe.ingredients);
    };

    // Split items by source (manual vs POS)
    const manualItems = items.filter(i => i.source === 'MANUAL');
    const posItems = items.filter(i => i.source === 'POS');

    return {
        loading,
        items,
        recipes,
        manualItems,
        posItems,
        loadData,
        deleteItem,
        deleteRecipe,
        calculateIngredientCost,   // new
        calculateRecipeCost        // legacy
    };
};