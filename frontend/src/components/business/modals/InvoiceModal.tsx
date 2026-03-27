// FILE: src/components/business/modals/InvoiceModal.tsx
// PHOENIX PROTOCOL - INVOICE MODAL V21.3 (WORKSPACE AWARE)

import React, { useState, useEffect } from 'react';
import { X, User, FileText, Plus, Trash2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Invoice, InvoiceItem, Partner } from '../../../data/types';
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
    const { workspace } = useAuth();
    const [partners, setPartners] = useState<Partner[]>([]);
    const [formData, setFormData] = useState({ 
        client_name: '', client_email: '', client_phone: '', client_address: '', 
        client_city: '', client_tax_id: '', client_website: '', 
        tax_rate: 18, notes: '', status: 'PAID'
    });
    const [includeVat, setIncludeVat] = useState(true);
    const [lineItems, setLineItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);

    useEffect(() => {
        if (isOpen) {
            apiService.getPartners().then(data => { setPartners(data.filter(p => p.type === 'CLIENT')); });
        }
    }, [isOpen]);

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
                setLineItems(invoiceToEdit.items || [{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
            } else {
                setFormData({ client_name: '', client_email: '', client_phone: '', client_address: '', client_city: '', client_tax_id: '', client_website: '', tax_rate: 18, notes: '', status: 'PAID' });
                setIncludeVat(true);
                setLineItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
            }
        }
    }, [isOpen, invoiceToEdit]);

    const handleClientChange = (name: string) => {
        setFormData(prev => ({ ...prev, client_name: name }));
        const m = partners.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (m) setFormData(p => ({ ...p, client_email: m.email || p.client_email, client_phone: m.phone || p.client_phone, client_address: m.address || p.client_address, client_tax_id: m.tax_id || p.client_tax_id }));
    };

    const updateLineItem = (i: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...lineItems];
        newItems[i] = { ...newItems[i], [field]: value, total: (field === 'quantity' ? value : newItems[i].quantity) * (field === 'unit_price' ? value : newItems[i].unit_price) };
        setLineItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...formData, items: lineItems, tax_rate: includeVat ? formData.tax_rate : 0 };
            if (invoiceToEdit) {
                await apiService.updateInvoice(invoiceToEdit.id, payload);
            } else {
                await apiService.createInvoice(payload, workspace?.id);  // <-- passes workspace ID
            }
            onSuccess(); onClose();
        } catch { alert(t('error.generic')); }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-canvas/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel w-full max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 custom-finance-scroll shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-text-primary">{invoiceToEdit ? t('finance.editInvoice') : t('finance.createInvoice')}</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Client Information */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><User size={14} /> {t('caseCard.client')}</h3>
                        <div className="relative">
                            <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-1">{t('business.clientName')}</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                                <input list="p-list" required className="glass-input w-full pl-9" value={formData.client_name} onChange={e => handleClientChange(e.target.value)} />
                                <datalist id="p-list">{partners.map(p => <option key={p.id} value={p.name} />)}</datalist>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-1">{t('business.publicEmail')}</label>
                                <input placeholder={t('business.publicEmail')} className="glass-input w-full" value={formData.client_email} onChange={e => setFormData({...formData, client_email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-1">{t('business.phone')}</label>
                                <input placeholder={t('business.phone')} className="glass-input w-full" value={formData.client_phone} onChange={e => setFormData({...formData, client_phone: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-1">{t('business.address')}</label>
                            <input placeholder={t('business.address')} className="w-full glass-input" value={formData.client_address} onChange={e => setFormData({...formData, client_address: e.target.value})} />
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="space-y-3 pt-4 border-t border-border-main">
                        <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><FileText size={14} /> {t('finance.services')}</h3>
                        {lineItems.map((item, index) => (
                            <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                                <input required placeholder={t('finance.description')} className="flex-1 w-full glass-input" value={item.description} onChange={e => updateLineItem(index, 'description', e.target.value)} />
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <input type="number" placeholder="Qty" className="w-20 glass-input" value={item.quantity} onChange={e => updateLineItem(index, 'quantity', parseFloat(e.target.value))} />
                                    <input type="number" placeholder="Price" className="w-24 glass-input" value={item.unit_price} onChange={e => updateLineItem(index, 'unit_price', parseFloat(e.target.value))} />
                                </div>
                                <button type="button" onClick={() => setLineItems(lineItems.filter((_, idx) => idx !== index))} className="p-2 text-danger-start sm:mt-0 mt-2">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                        <button type="button" onClick={() => setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0, total: 0 }])} className="text-sm text-primary flex items-center gap-1">
                            <Plus size={14} /> {t('finance.addLine')}
                        </button>
                        
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                id="includeVat"
                                type="checkbox"
                                className="form-checkbox h-4 w-4 text-primary bg-surface border-border-main rounded focus:ring-primary"
                                checked={includeVat}
                                onChange={(e) => setIncludeVat(e.target.checked)}
                            />
                            <label htmlFor="includeVat" className="text-sm text-text-secondary cursor-pointer">
                                {t('finance.applyVat', 'Apliko TVSH (18%)')}
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2 rounded-xl text-text-muted hover:text-text-primary glass-input !bg-surface hover:bg-hover transition-colors">
                            {t('general.cancel')}
                        </button>
                        <button type="submit" className="w-full sm:w-auto btn-primary px-6 py-2 rounded-xl">
                            {t('general.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};