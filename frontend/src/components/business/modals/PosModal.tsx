// FILE: src/components/business/modals/PosModal.tsx
// PHOENIX PROTOCOL - POS MODAL V2.3 (COMPLETE PAYLOAD FOR INVOICE)

import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, AlertCircle, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useFiscal } from '../../../hooks/useFiscal';
import { InventoryItem } from '../../../data/types';

interface PosModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const PosModal: React.FC<PosModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const { workspace } = useAuth();
    const { vatRate, calculateSellingPrice, getMarginDisplay } = useFiscal();
    
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [selectedItemId, setSelectedItemId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [priceOverride, setPriceOverride] = useState<number | null>(null);
    const [useSuggestedPrice, setUseSuggestedPrice] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            apiService.getInventoryItems(workspace?.id).then(setInventoryItems);
        }
    }, [isOpen, workspace?.id]);

    const selectedItem = inventoryItems.find(i => i._id === selectedItemId);
    
    const costForQuantity = selectedItem ? selectedItem.cost_per_unit * quantity : 0;
    const suggestedPrice = selectedItem ? calculateSellingPrice(costForQuantity) : 0;
    const vatAmount = (priceOverride !== null ? priceOverride : suggestedPrice) * (vatRate / 100);
    const totalWithVat = (priceOverride !== null ? priceOverride : suggestedPrice) + vatAmount;
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
            const now = new Date().toISOString();
            await apiService.createPosTransaction({
                inventory_item_id: selectedItemId,
                quantity: quantity,
                total_price: totalPrice,
                product_name: selectedItem?.name || 'Produkt POS',
                description: `${selectedItem?.name || 'Produkt'} x${quantity}`,
                transaction_date: now,
                payment_method: 'CASH',
                notes: `Shitje POS: ${selectedItem?.name} x${quantity} = €${totalPrice.toFixed(2)}`
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

    const handleItemChange = (itemId: string) => {
        setSelectedItemId(itemId);
        setPriceOverride(null);
        setUseSuggestedPrice(true);
        setError('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-canvas/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel w-full max-w-md p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                        <ShoppingCart className="text-success-start" size={20} />
                        Krijo Shitje
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
                            onChange={(e) => handleItemChange(e.target.value)}
                            required
                        >
                            <option value="">{t('pos.selectProduct')}</option>
                            {inventoryItems.map(item => (
                                <option key={item._id} value={item._id}>
                                    {item.name} | Stock: {item.current_stock} | Kosto: €{item.cost_per_unit}
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
                            onChange={(e) => {
                                setQuantity(parseInt(e.target.value) || 1);
                                setPriceOverride(null);
                                setUseSuggestedPrice(true);
                            }}
                            required
                        />
                    </div>
                    
                    {selectedItem && (
                        <div className="bg-primary-start/10 border border-primary-start/30 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-primary-start text-xs font-bold uppercase tracking-widest mb-2">
                                <TrendingUp size={14} />
                                Informacion i Çmimit
                            </div>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-text-muted">Kosto e produktit:</span>
                                    <span className="font-mono">€{selectedItem.cost_per_unit.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-text-muted">Marzha e biznesit:</span>
                                    <span className="font-mono">{getMarginDisplay()}</span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-primary-start/20">
                                    <span className="text-text-muted">Çmimi i sugjeruar (pa TVSH):</span>
                                    <span className="font-mono font-bold">€{suggestedPrice.toFixed(2)}</span>
                                </div>
                                {vatRate > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-text-muted">TVSH ({vatRate}%):</span>
                                        <span className="font-mono">€{vatAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {vatRate > 0 && (
                                    <div className="flex justify-between font-bold">
                                        <span>Totali me TVSH:</span>
                                        <span className="font-mono">€{totalWithVat.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <input
                                type="checkbox"
                                id="useSuggestedPrice"
                                checked={useSuggestedPrice}
                                onChange={(e) => {
                                    setUseSuggestedPrice(e.target.checked);
                                    if (e.target.checked) setPriceOverride(null);
                                }}
                                className="form-checkbox h-3.5 w-3.5 text-primary bg-surface border-border-main rounded"
                            />
                            <label htmlFor="useSuggestedPrice" className="text-xs font-black uppercase tracking-widest text-text-muted">
                                Përdor çmimin e sugjeruar
                            </label>
                        </div>
                        
                        {!useSuggestedPrice && (
                            <>
                                <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-1">
                                    {t('pos.totalPrice')} (pa TVSH)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="glass-input w-full"
                                    value={totalPrice}
                                    onChange={(e) => setPriceOverride(parseFloat(e.target.value))}
                                    placeholder="Vendos çmimin manualisht"
                                />
                            </>
                        )}
                        
                        {!useSuggestedPrice && vatRate > 0 && (
                            <p className="text-xs text-text-muted mt-1">
                                TVSH ({vatRate}%): €{vatAmount.toFixed(2)} | Totali me TVSH: €{totalWithVat.toFixed(2)}
                            </p>
                        )}
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