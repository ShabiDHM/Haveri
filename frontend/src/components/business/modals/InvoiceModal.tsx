// FILE: src/components/business/modals/InvoiceModal.tsx
// PHOENIX PROTOCOL - INVOICE MODAL V18.3 (CLEANUP)
// 1. CLEANUP: Removed unused hooks/types to resolve TS6133.
// 2. STATUS: End-to-End Invoicing Automation maintained.

import React, { useState, useEffect } from 'react';
import { X, User, FileText, Plus, Trash2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Invoice, InvoiceItem, Partner } from '../../../data/types';
import { apiService } from '../../../services/api';

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    invoiceToEdit: Invoice | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, onSuccess, invoiceToEdit }) => {
    const { t } = useTranslation();
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
            if (invoiceToEdit) await apiService.updateInvoice(invoiceToEdit.id, payload);
            else await apiService.createInvoice(payload);
            onSuccess(); onClose();
        } catch { alert(t('error.generic')); }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-background-dark border border-glass-edge rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 custom-finance-scroll shadow-2xl">
                <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">{invoiceToEdit ? t('finance.editInvoice') : t('finance.createInvoice')}</h2><button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button></div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-primary-start uppercase tracking-widest flex items-center gap-2"><User size={14} /> {t('caseCard.client')}</h3>
                        <div className="relative">
                            <label className="block text-sm text-gray-400 mb-1">{t('business.clientName')}</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                                <input list="p-list" required className="w-full bg-background-light border-glass-edge rounded-lg pl-9 pr-3 py-2 text-white" value={formData.client_name} onChange={e => handleClientChange(e.target.value)} />
                                <datalist id="p-list">{partners.map(p => <option key={p.id} value={p.name} />)}</datalist>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input placeholder={t('business.publicEmail')} className="bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={formData.client_email} onChange={e => setFormData({...formData, client_email: e.target.value})} />
                            <input placeholder={t('business.phone')} className="bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={formData.client_phone} onChange={e => setFormData({...formData, client_phone: e.target.value})} />
                        </div>
                        <input placeholder={t('business.address')} className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={formData.client_address} onChange={e => setFormData({...formData, client_address: e.target.value})} />
                    </div>
                    <div className="space-y-3 pt-4 border-t border-white/10">
                        <h3 className="text-xs font-bold text-primary-start uppercase tracking-widest flex items-center gap-2"><FileText size={14} /> {t('finance.services')}</h3>
                        {lineItems.map((item, index) => (
                            <div key={index} className="flex gap-2 items-center">
                                <input required placeholder={t('finance.description')} className="flex-1 bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={item.description} onChange={e => updateLineItem(index, 'description', e.target.value)} />
                                <input type="number" className="w-20 bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={item.quantity} onChange={e => updateLineItem(index, 'quantity', parseFloat(e.target.value))} />
                                <input type="number" className="w-24 bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={item.unit_price} onChange={e => updateLineItem(index, 'unit_price', parseFloat(e.target.value))} />
                                <button type="button" onClick={() => setLineItems(lineItems.filter((_, idx) => idx !== index))} className="p-2 text-rose-400"><Trash2 size={18} /></button>
                            </div>
                        ))}
                        <button type="button" onClick={() => setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0, total: 0 }])} className="text-sm text-primary-start flex items-center gap-1"><Plus size={14} /> {t('finance.addLine')}</button>
                    </div>
                    <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 text-gray-400">{t('general.cancel')}</button><button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold">{t('general.save')}</button></div>
                </form>
            </div>
        </div>
    );
};