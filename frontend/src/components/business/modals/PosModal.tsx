// FILE: src/components/business/modals/PosModal.tsx
// POS Modal with inventory dropdown and stock validation

import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { InventoryItem } from '../../../data/types';

interface PosModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const PosModal: React.FC<PosModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const { workspace } = useAuth();
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [selectedItemId, setSelectedItemId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [priceOverride, setPriceOverride] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            apiService.getInventoryItems(workspace?.id).then(setInventoryItems);
        }
    }, [isOpen, workspace?.id]);

    const selectedItem = inventoryItems.find(i => i._id === selectedItemId);
    const suggestedPrice = selectedItem ? selectedItem.cost_per_unit * quantity : 0;
    const totalPrice = priceOverride !== null ? priceOverride : suggestedPrice;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItemId) {
            setError(t('pos.selectProduct'));
            return;
        }
        if (quantity <= 0) {
            setError(t('pos.positiveQuantity'));
            return;
        }
        setLoading(true);
        setError('');
        try {
            await apiService.createPosTransaction({
                inventory_item_id: selectedItemId,
                quantity,
                total_price: totalPrice,
            }, workspace?.id);
            onSuccess();
            onClose();
        } catch (err: any) {
            const msg = err.response?.data?.detail || t('error.generic');
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-canvas/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel w-full max-w-md p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                        <ShoppingCart className="text-success-start" size={20} />
                        {t('pos.addSale')}
                    </h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-1">
                            {t('pos.product')}
                        </label>
                        <select
                            className="glass-input w-full"
                            value={selectedItemId}
                            onChange={(e) => setSelectedItemId(e.target.value)}
                            required
                        >
                            <option value="">{t('pos.selectProduct')}</option>
                            {inventoryItems.map(item => (
                                <option key={item._id} value={item._id}>
                                    {item.name} (Stock: {item.current_stock}, €{item.cost_per_unit})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-1">
                            {t('pos.quantity')}
                        </label>
                        <input
                            type="number"
                            step="1"
                            min="1"
                            className="glass-input w-full"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-1">
                            {t('pos.totalPrice')}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            className="glass-input w-full"
                            value={totalPrice}
                            onChange={(e) => setPriceOverride(parseFloat(e.target.value))}
                        />
                        <p className="text-xs text-text-muted mt-1">
                            {t('pos.suggestedPrice')}: €{suggestedPrice.toFixed(2)}
                        </p>
                    </div>
                    {error && (
                        <div className="bg-danger-start/10 border border-danger-start/30 rounded-xl p-3 flex items-center gap-2 text-danger-start text-sm">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="glass-input !bg-surface hover:bg-hover px-4 py-2 rounded-xl">
                            {t('general.cancel')}
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary px-6 py-2 rounded-xl flex items-center gap-2">
                            {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
                            {t('general.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};