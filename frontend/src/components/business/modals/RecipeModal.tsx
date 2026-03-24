// FILE: src/components/business/modals/RecipeModal.tsx
// PHOENIX PROTOCOL - RECIPE MODAL V18.0 (DESIGN SYSTEM STANDARDIZED)
// STATUS: VERIFIED - COMPLETE FILE REPLACEMENT

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
        <div className="fixed inset-0 bg-canvas/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto shadow-xl">
                <h3 className="text-lg sm:text-xl font-bold text-text-primary mb-2">
                    {recipeToEdit ? t('inventory.recipes.edit') : t('inventory.recipes.add')}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-1">{t('inventory.recipes.productName')}</label>
                        <input placeholder={t('inventory.recipes.example')} required type="text" className="glass-input w-full" 
                            value={formData.product_name} onChange={e => setFormData({...formData, product_name: e.target.value})} 
                        />
                        <p className="text-xs text-text-muted mt-1">{t('inventory.recipes.productNameDesc')}</p>
                    </div>
                    
                    <div className="border-t border-border-main pt-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-3">{t('inventory.recipes.ingredients')}</h4>
                        {formData.ingredients.map((ing, index) => (
                            <div key={index} className="flex gap-2 mb-2 items-center">
                                <select required className="flex-1 glass-input text-sm appearance-none w-full min-w-0" 
                                    value={ing.inventory_item_id} onChange={e => updateIngredient(index, 'inventory_item_id', e.target.value)}
                                >
                                    <option value="">{t('inventory.recipes.selectIngredient')}</option>
                                    {inventoryItems.map(i => <option key={i._id} value={i._id}>{i.name} ({i.unit})</option>)}
                                </select>
                                <input required type="number" step="0.001" placeholder="Qty" className="w-16 sm:w-20 glass-input text-sm" 
                                    value={ing.quantity_required} onChange={e => updateIngredient(index, 'quantity_required', parseFloat(e.target.value))}
                                />
                                <button type="button" onClick={() => removeIngredient(index)} className="text-danger-start hover:bg-danger-start/10 p-1.5 rounded">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        <button type="button" onClick={addIngredientRow} className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 mt-2">
                            <Plus size={14} /> {t('inventory.recipes.addIngredient')}
                        </button>
                    </div>
                    
                    <div className="bg-surface p-3 rounded-lg text-right">
                        <span className="text-xs font-black uppercase tracking-widest text-text-muted">{t('inventory.recipes.costPreview')}</span>
                        <span className="text-success-start font-bold ml-2">€{calculateCost(formData.ingredients).toFixed(3)}</span>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-text-muted hover:text-text-primary glass-input !bg-surface hover:bg-hover transition-colors">
                            {t('inventory.cancel')}
                        </button>
                        <button type="submit" className="btn-primary px-6 py-2 rounded-xl">
                            {t('inventory.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
