// FILE: src/components/business/modals/InventoryItemModal.tsx
// PHOENIX PROTOCOL - COMPONENT EXTRACTION V1.0
// Handles Create/Update for Inventory Items.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { InventoryItem, InventoryItemCreate } from '../../../data/types';
import { apiService } from '../../../services/api';

interface InventoryItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    itemToEdit: InventoryItem | null;
}

export const InventoryItemModal: React.FC<InventoryItemModalProps> = ({ isOpen, onClose, onSuccess, itemToEdit }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<InventoryItemCreate>({ 
        name: '', 
        unit: 'kg', 
        current_stock: 0, 
        cost_per_unit: 0, 
        low_stock_threshold: 5 
    });

    useEffect(() => {
        if (isOpen) {
            if (itemToEdit) {
                setFormData({
                    name: itemToEdit.name,
                    unit: itemToEdit.unit,
                    current_stock: itemToEdit.current_stock,
                    cost_per_unit: itemToEdit.cost_per_unit,
                    low_stock_threshold: itemToEdit.low_stock_threshold
                });
            } else {
                setFormData({ name: '', unit: 'kg', current_stock: 0, cost_per_unit: 0, low_stock_threshold: 5 });
            }
        }
    }, [isOpen, itemToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (itemToEdit) {
                await apiService.updateInventoryItem(itemToEdit._id, formData);
            } else {
                await apiService.createInventoryItem(formData);
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
            <div className="bg-background-dark border border-glass-edge rounded-2xl w-full max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-4">
                    {itemToEdit ? t('inventory.items.edit', 'Edit Item') : t('inventory.items.add')}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">{t('inventory.items.name')}</label>
                        <input required type="text" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-base sm:text-sm" 
                            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">{t('inventory.items.unit')}</label>
                            <select className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-base sm:text-sm appearance-none" 
                                value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}
                            >
                                <option value="kg">{t('units.kg', 'Kg')}</option>
                                <option value="litra">{t('units.liters', 'Litra')}</option>
                                <option value="cope">{t('units.pieces', 'Copë')}</option>
                                <option value="gr">{t('units.grams', 'Gram')}</option>
                                <option value="ml">{t('units.milliliters', 'Mililitra')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">{t('inventory.items.cost')}</label>
                            <input required type="number" step="0.01" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-base sm:text-sm" 
                                value={formData.cost_per_unit} onChange={e => setFormData({...formData, cost_per_unit: parseFloat(e.target.value)})} 
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">{t('inventory.items.stock')}</label>
                            <input required type="number" step="0.001" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-base sm:text-sm" 
                                value={formData.current_stock} onChange={e => setFormData({...formData, current_stock: parseFloat(e.target.value)})} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">{t('inventory.items.lowStock')}</label>
                            <input type="number" step="1" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-base sm:text-sm" 
                                value={formData.low_stock_threshold} onChange={e => setFormData({...formData, low_stock_threshold: parseFloat(e.target.value)})} 
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400">{t('inventory.cancel')}</button>
                        <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium">{t('inventory.save')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};