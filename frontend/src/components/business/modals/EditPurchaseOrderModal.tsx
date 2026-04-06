// FILE: src/components/business/modals/EditPurchaseOrderModal.tsx
// Edit Purchase Order Modal – allows editing of existing purchase orders

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../../../services/api';

interface EditPurchaseOrderModalProps {
    isOpen: boolean;
    archiveId: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

export const EditPurchaseOrderModal: React.FC<EditPurchaseOrderModalProps> = ({
    isOpen,
    archiveId,
    onClose,
    onSuccess,
}) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [poNumber, setPoNumber] = useState('');
    const [formData, setFormData] = useState({
        item_id: '',
        item_name: '',
        unit: '',
        quantity: 0,
        estimated_cost: 0,
        supplier_name: '',
        supplier_address: '',
        supplier_vat: '',
        notes: '',
    });

    useEffect(() => {
        if (isOpen && archiveId) {
            fetchData();
        }
    }, [isOpen, archiveId]);

    const fetchData = async () => {
        if (!archiveId) return;
        setLoading(true);
        try {
            const response = await apiService.getPurchaseOrderData(archiveId);
            setPoNumber(response.po_number);
            setFormData({
                item_id: response.order_data.item_id,
                item_name: response.order_data.item_name,
                unit: response.order_data.unit,
                quantity: response.order_data.quantity,
                estimated_cost: response.order_data.estimated_cost,
                supplier_name: response.order_data.supplier_name,
                supplier_address: response.order_data.supplier_address || '',
                supplier_vat: response.order_data.supplier_vat || '',
                notes: response.order_data.notes || '',
            });
        } catch (err) {
            console.error('Failed to fetch purchase order data:', err);
            alert(t('error.generic'));
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === 'quantity' || name === 'estimated_cost' ? parseFloat(value) : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!archiveId) return;
        setSaving(true);
        try {
            await apiService.updatePurchaseOrder(archiveId, {
                po_number: poNumber,
                ...formData,
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to update purchase order:', err);
            alert(t('error.generic'));
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.95 }}
                        className="relative glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl border border-border-main"
                    >
                        <div className="sticky top-0 bg-primary-start p-5 flex justify-between items-center rounded-t-2xl">
                            <h3 className="text-white font-bold text-lg">
                                {t('purchaseOrder.editTitle', 'Edit Purchase Order')}
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex justify-center p-12">
                                <Loader2 className="animate-spin text-primary-start" size={32} />
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                                            {t('purchaseOrder.itemName', 'Product Name')}
                                        </label>
                                        <input
                                            type="text"
                                            name="item_name"
                                            value={formData.item_name}
                                            onChange={handleChange}
                                            className="glass-input w-full p-2 border border-border-main rounded-lg"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                                            {t('purchaseOrder.unit', 'Unit')}
                                        </label>
                                        <input
                                            type="text"
                                            name="unit"
                                            value={formData.unit}
                                            onChange={handleChange}
                                            className="glass-input w-full p-2 border border-border-main rounded-lg"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                                            {t('purchaseOrder.quantity', 'Quantity')}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="quantity"
                                            value={formData.quantity}
                                            onChange={handleChange}
                                            className="glass-input w-full p-2 border border-border-main rounded-lg"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                                            {t('purchaseOrder.estimatedCost', 'Estimated Cost (€)')}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="estimated_cost"
                                            value={formData.estimated_cost}
                                            onChange={handleChange}
                                            className="glass-input w-full p-2 border border-border-main rounded-lg"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                                        {t('purchaseOrder.supplierName', 'Supplier Name')}
                                    </label>
                                    <input
                                        type="text"
                                        name="supplier_name"
                                        value={formData.supplier_name}
                                        onChange={handleChange}
                                        className="glass-input w-full p-2 border border-border-main rounded-lg"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                                        {t('purchaseOrder.supplierAddress', 'Supplier Address')}
                                    </label>
                                    <input
                                        type="text"
                                        name="supplier_address"
                                        value={formData.supplier_address}
                                        onChange={handleChange}
                                        className="glass-input w-full p-2 border border-border-main rounded-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                                        {t('purchaseOrder.supplierVat', 'Supplier VAT')}
                                    </label>
                                    <input
                                        type="text"
                                        name="supplier_vat"
                                        value={formData.supplier_vat}
                                        onChange={handleChange}
                                        className="glass-input w-full p-2 border border-border-main rounded-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                                        {t('purchaseOrder.notes', 'Notes')}
                                    </label>
                                    <textarea
                                        name="notes"
                                        rows={3}
                                        value={formData.notes}
                                        onChange={handleChange}
                                        className="glass-input w-full p-2 border border-border-main rounded-lg"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 rounded-lg glass-input border border-border-main hover:bg-hover transition-colors"
                                    >
                                        {t('general.cancel', 'Cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="btn-primary px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {saving && <Loader2 size={16} className="animate-spin" />}
                                        <Save size={16} />
                                        {t('general.save', 'Save')}
                                    </button>
                                </div>
                            </form>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};