// FILE: src/hooks/useInventoryData.ts
// PHOENIX PROTOCOL - HOOK EXTRACTION V1.0
// Centralizes Inventory/Recipe logic and calculations.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '../services/api';
import { InventoryItem, Recipe, Ingredient } from '../data/types';

export const useInventoryData = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [fetchedItems, fetchedRecipes] = await Promise.all([
                apiService.getInventoryItems(),
                apiService.getRecipes()
            ]);
            setItems(fetchedItems);
            setRecipes(fetchedRecipes);
        } catch (e) {
            console.error("Failed to load inventory data", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Derived State
    const { manualItems, posItems } = useMemo(() => {
        const manual = items.filter(i => (i as any).source !== 'POS');
        const pos = items.filter(i => (i as any).source === 'POS');
        return { manualItems: manual, posItems: pos };
    }, [items]);

    // Helpers
    const calculateRecipeCost = useCallback((ingredients: Ingredient[]) => {
        return ingredients.reduce((total, ing) => {
            const item = items.find(i => i._id === ing.inventory_item_id);
            return total + (item ? item.cost_per_unit * ing.quantity_required : 0);
        }, 0);
    }, [items]);

    // CRUD Wrappers
    const deleteItem = async (id: string) => {
        await apiService.deleteInventoryItem(id);
        setItems(prev => prev.filter(i => i._id !== id));
    };

    const deleteRecipe = async (id: string) => {
        await apiService.deleteRecipe(id);
        setRecipes(prev => prev.filter(r => r._id !== id));
    };

    return {
        loading,
        items,
        recipes,
        manualItems,
        posItems,
        loadData, // Exposed for refresh after modal actions
        deleteItem,
        deleteRecipe,
        calculateRecipeCost
    };
};