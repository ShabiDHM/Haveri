// FILE: src/components/business/modals/InvoiceModal.tsx
// PHOENIX PROTOCOL - INVOICE MODAL V22.4 (DYNAMIC VAT RATE FROM BUSINESS PROFILE)

import React, { useState, useEffect } from 'react';
import { X, User, FileText, Plus, Trash2, Search, Package, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Invoice, InvoiceItem, Partner, InventoryItem } from '../../../data/types';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    invoiceToEdit: Invoice | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, onSuccess, invoiceToEdit }) => {
    const { t } = useTranslation();
    const { workspace, businessProfile } = useAuth(); // PHOENIX: Get business profile for dynamic tax rate
    
    // PHOENIX: Derive dynamic tax rate from business profile, fallback to 18
    const defaultTaxRate = businessProfile?.vat_rate ?? 18;
    
    const [partners, setPartners] = useState<Partner[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [formData, setFormData] = useState({ 
        client_name: '', client_email: '', client_phone: '', client_address: '', 
        client_city: '', client_tax_id: '', client_website: '', 
        tax_rate: defaultTaxRate, notes: '', status: 'PAID'
    });
    const [includeVat, setIncludeVat] = useState(true);
    const [lineItems, setLineItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);

    // Fetch partners and inventory when modal opens
    useEffect(() => {
        if (isOpen) {
            apiService.getPartners().then(data => setPartners(data.filter(p => p.type === 'CLIENT')));
            apiService.getInventoryItems(workspace?.id).then(data => setInventoryItems(data));
        }
    }, [isOpen, workspace?.id]);

    // Load editing data
    useEffect(() => {
        if (isOpen) {
            if (invoiceToEdit) {
                setFormData({
                    client_name: invoiceToEdit.client_name,
                    client_email: invoiceToEdit.client_email || '',
                    client_address: invoiceToEdit.client_address || '',
                    client_phone: (invoiceToEdit as any).client_phone || '',
                    client_city: (invoiceToEdit as any).client_city || '',
                    client_tax_id: (invoiceToEdit as any).client_tax_id || '',
                    client_website: (invoiceToEdit as any).client_website || '',
                    tax_rate: invoiceToEdit.tax_rate,
                    notes: invoiceToEdit.notes || '',
                    status: invoiceToEdit.status
                });
                setIncludeVat(invoiceToEdit.tax_rate > 0);
                const items = invoiceToEdit.items || [{ description: '', quantity: 1, unit_price: 0, total: 0 }];
                setLineItems(items);
            } else {
                setFormData({ 
                    client_name: '', client_email: '', client_phone: '', client_address: '', 
                    client_city: '', client_tax_id: '', client_website: '', 
                    tax_rate: defaultTaxRate, notes: '', status: 'PAID' 
                });
                setIncludeVat(true);
                setLineItems([{ description: '', quantity: 1, unit_price: 0, total: 0, inventory_item_id: undefined }]);
            }
        }
    }, [isOpen, invoiceToEdit, defaultTaxRate]);

    const handleClientChange = (name: string) => {
        setFormData(prev => ({ ...prev, client_name: name }));
        const m = partners.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (m) setFormData(p => ({ ...p, client_email: m.email || p.client_email, client_phone: m.phone || p.client_phone, client_address: m.address || p.client_address, client_tax_id: m.tax_id || p.client_tax_id }));
    };

    const updateLineItem = (i: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...lineItems];
        if (field === 'inventory_item_id') {
            const selectedItem = inventoryItems.find(item => item._id === value);
            if (selectedItem) {
                newItems[i] = {
                    ...newItems[i],
                    inventory_item_id: value,
                    description: selectedItem.name,
                };
            } else {
                newItems[i] = { ...newItems[i], inventory_item_id: value };
            }
        } else if (field === 'description' || field === 'quantity' || field === 'unit_price') {
            newItems[i] = { ...newItems[i], [field]: value };
        }
        // Recalculate total
        newItems[i].total = (newItems[i].quantity || 0) * (newItems[i].unit_price || 0);
        setLineItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...formData, items: lineItems, tax_rate: includeVat ? formData.tax_rate : 0 };
            if (invoiceToEdit) {
                await apiService.updateInvoice(invoiceToEdit.id, payload);
            } else {
                await apiService.createInvoice(payload, workspace?.id);
            }
            onSuccess(); onClose();
        } catch (err) {
            console.error(err);
            alert(t('error.generic'));
        }
    };

    if (!isOpen) return null;

    // PHOENIX: Display current tax rate in UI
    const currentTaxRate = includeVat ? formData.tax_rate : 0;

    return (
        <div className="fixed inset-0 bg-canvas/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel w-full max-w-full sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-5 custom-finance-scroll shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-text-primary">{invoiceToEdit ? t('finance.editInvoice') : t('finance.createInvoice')}</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2.5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <User size={14} /> {t('finance.clientInfo', 'Informacioni i Klientit')}
                        </h3>
                        <div className="relative">
                            <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-0.5">{t('business.clientName')}</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                                <input list="p-list" required className="glass-input w-full pl-9" value={formData.client_name} onChange={e => handleClientChange(e.target.value)} />
                                <datalist id="p-list">{partners.map(p => <option key={p.id} value={p.name} />)}</datalist>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-0.5">{t('business.publicEmail')}</label>
                                <input placeholder={t('business.publicEmail')} className="glass-input w-full" value={formData.client_email} onChange={e => setFormData({...formData, client_email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-0.5">{t('business.phone')}</label>
                                <input placeholder={t('business.phone')} className="glass-input w-full" value={formData.client_phone} onChange={e => setFormData({...formData, client_phone: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-0.5">{t('business.address')}</label>
                            <input placeholder={t('business.address')} className="w-full glass-input" value={formData.client_address} onChange={e => setFormData({...formData, client_address: e.target.value})} />
                        </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-border-main">
                        <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-1"><FileText size={14} /> {t('finance.services')}</h3>
                        {lineItems.map((item, index) => (
                            <div key={index} className="flex flex-col gap-1.5 border border-border-main rounded-xl p-2 bg-surface/20">
                                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                                    <div className="flex-1 min-w-[120px]">
                                        <select
                                            className="glass-input w-full"
                                            value={item.inventory_item_id || ''}
                                            onChange={e => updateLineItem(index, 'inventory_item_id', e.target.value)}
                                        >
                                            <option value="">{t('finance.selectProduct', 'Zgjidh Produktin (ose lëre bosh për shërbim)')}</option>
                                            {inventoryItems.map(inv => (
                                                <option key={inv._id} value={inv._id}>{inv.name} (€{inv.cost_per_unit})</option>
                                            ))}
                                        </select>
                                        <div className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                                            <Info size={10} />
                                            {t('finance.customServiceHint', 'Mund të lini bosh dhe të shkruani manualisht përshkrimin më poshtë')}
                                        </div>
                                    </div>
                                    <input
                                        required
                                        placeholder={t('finance.description', 'Përshkrimi i shërbimit/produktit')}
                                        className="flex-1 glass-input min-w-[120px]"
                                        value={item.description}
                                        onChange={e => updateLineItem(index, 'description', e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder="Qty"
                                            className="w-16 glass-input text-center px-2"
                                            value={item.quantity}
                                            onChange={e => updateLineItem(index, 'quantity', parseFloat(e.target.value))}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Price"
                                            className="w-20 glass-input text-center px-2"
                                            value={item.unit_price}
                                            onChange={e => updateLineItem(index, 'unit_price', parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setLineItems(lineItems.filter((_, idx) => idx !== index))}
                                        className="p-1.5 text-danger-start hover:bg-danger-start/10 rounded-md transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                {item.inventory_item_id && (
                                    <div className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                                        <Package size={10} />
                                        {t('finance.linkedInventory')}
                                    </div>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0, total: 0, inventory_item_id: undefined }])}
                            className="text-xs text-primary flex items-center gap-1 pt-1"
                        >
                            <Plus size={14} /> {t('finance.addLine')}
                        </button>

                        {/* PHOENIX: Dynamic VAT checkbox with current tax rate display */}
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                id="includeVat"
                                type="checkbox"
                                className="form-checkbox h-3.5 w-3.5 text-primary bg-surface border-border-main rounded focus:ring-primary"
                                checked={includeVat}
                                onChange={(e) => setIncludeVat(e.target.checked)}
                            />
                            <label htmlFor="includeVat" className="text-xs text-text-secondary cursor-pointer">
                                {t('finance.applyVat', 'Apliko TVSH')} ({currentTaxRate}%)
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3">
                        <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-1.5 rounded-xl text-sm text-text-muted hover:text-text-primary glass-input !bg-surface hover:bg-hover transition-colors">
                            {t('general.cancel')}
                        </button>
                        <button type="submit" className="w-full sm:w-auto btn-primary px-6 py-1.5 text-sm rounded-xl">
                            {t('general.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};