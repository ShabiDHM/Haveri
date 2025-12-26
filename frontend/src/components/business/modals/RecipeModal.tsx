// FILE: src/components/business/modals/RecipeModal.tsx
// PHOENIX PROTOCOL - COMPONENT EXTRACTION V1.0
// Handles Create/Update for Recipes and Ingredient mapping.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Plus } from 'lucide-react';
import { Recipe, Ingredient, InventoryItem, RecipeCreate } from '../../../data/types';
import { apiService } from '../../../services/api';

interface RecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    recipeToEdit: Recipe | null;
    inventoryItems: InventoryItem[];
    calculateCost: (ingredients: Ingredient[]) => number;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({ 
    isOpen, onClose, onSuccess, recipeToEdit, inventoryItems, calculateCost 
}) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<RecipeCreate>({ product_name: '', ingredients: [] });

    useEffect(() => {
        if (isOpen) {
            if (recipeToEdit) {
                setFormData({
                    product_name: recipeToEdit.product_name,
                    ingredients: recipeToEdit.ingredients
                });
            } else {
                setFormData({ product_name: '', ingredients: [] });
            }
        }
    }, [isOpen, recipeToEdit]);

    const addIngredientRow = () => {
        setFormData(prev => ({ ...prev, ingredients: [...prev.ingredients, { inventory_item_id: '', quantity_required: 0 }] }));
    };

    const updateIngredient = (index: number, field: keyof Ingredient, value: any) => {
        const updated = [...formData.ingredients];
        updated[index] = { ...updated[index], [field]: value };
        setFormData(prev => ({ ...prev, ingredients: updated }));
    };

    const removeIngredient = (index: number) => {
        setFormData(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== index) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (recipeToEdit) {
                await apiService.updateRecipe(recipeToEdit._id, formData);
            } else {
                await apiService.createRecipe(formData);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert(t('error.generic'));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-background-dark border border-glass-edge rounded-2xl w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                    {recipeToEdit ? t('inventory.recipes.edit', 'Edit Recipe') : t('inventory.recipes.add')}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">{t('inventory.recipes.productName')}</label>
                        <input placeholder={t('inventory.recipes.example', 'e.g. Espresso Macchiato')} required type="text" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-base sm:text-sm" 
                            value={formData.product_name} onChange={e => setFormData({...formData, product_name: e.target.value})} 
                        />
                        <p className="text-xs text-gray-500 mt-1">{t('inventory.recipes.productNameDesc')}</p>
                    </div>
                    
                    <div className="border-t border-white/10 pt-4">
                        <h4 className="text-sm font-bold text-blue-400 mb-3">{t('inventory.recipes.ingredients')}</h4>
                        {formData.ingredients.map((ing, index) => (
                            <div key={index} className="flex gap-2 mb-2 items-center">
                                <select required className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-white text-sm appearance-none w-full min-w-0" 
                                    value={ing.inventory_item_id} onChange={e => updateIngredient(index, 'inventory_item_id', e.target.value)}
                                >
                                    <option value="">{t('inventory.recipes.selectIngredient')}</option>
                                    {inventoryItems.map(i => <option key={i._id} value={i._id}>{i.name} ({i.unit})</option>)}
                                </select>
                                <input required type="number" step="0.001" placeholder="Qty" className="w-16 sm:w-20 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-white text-sm" 
                                    value={ing.quantity_required} onChange={e => updateIngredient(index, 'quantity_required', parseFloat(e.target.value))}
                                />
                                <button type="button" onClick={() => removeIngredient(index)} className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        <button type="button" onClick={addIngredientRow} className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-2">
                            <Plus size={14} /> {t('inventory.recipes.addIngredient')}
                        </button>
                    </div>
                    
                    <div className="bg-white/5 p-3 rounded-lg text-right">
                        <span className="text-sm text-gray-400">{t('inventory.recipes.costPreview')}</span>
                        <span className="text-emerald-400 font-bold ml-2">€{calculateCost(formData.ingredients).toFixed(3)}</span>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400">{t('inventory.cancel')}</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium">{t('inventory.save')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};