// FILE: src/components/business/modals/InvoiceModal.tsx
// PHOENIX PROTOCOL - INVOICE MODAL V18.2 (CLEANUP)
// 1. CLEANUP: Removed unused imports to resolve TS6133 warnings.
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
            apiService.getPartners().then(data => {
                setPartners(data.filter(p => p.type === 'CLIENT'));
            });
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
                setLineItems(invoiceToEdit.items && invoiceToEdit.items.length > 0 ? invoiceToEdit.items : [{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
            } else {
                setFormData({ client_name: '', client_email: '', client_phone: '', client_address: '', client_city: '', client_tax_id: '', client_website: '', tax_rate: 18, notes: '', status: 'PAID' });
                setIncludeVat(true);
                setLineItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
            }
        }
    }, [isOpen, invoiceToEdit]);

    const handleClientNameChange = (name: string) => {
        setFormData(prev => ({ ...prev, client_name: name }));
        const matched = partners.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (matched) {
            setFormData(prev => ({
                ...prev,
                client_email: matched.email || prev.client_email,
                client_phone: matched.phone || prev.client_phone,
                client_address: matched.address || prev.client_address,
                client_tax_id: matched.tax_id || prev.client_tax_id
            }));
        }
    };

    const addLineItem = () => setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
    const removeLineItem = (i: number) => { if (lineItems.length > 1) setLineItems(lineItems.filter((_, idx) => idx !== i)); };
    const updateLineItem = (i: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...lineItems];
        newItems[i] = { ...newItems[i], [field]: value };
        newItems[i].total = newItems[i].quantity * newItems[i].unit_price;
        setLineItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const basePayload = { ...formData, items: lineItems, tax_rate: includeVat ? formData.tax_rate : 0 };
            if (invoiceToEdit) {
                await apiService.updateInvoice(invoiceToEdit.id, basePayload);
            } else {
                await apiService.createInvoice(basePayload);
            }
            onSuccess();
            onClose();
        } catch (error) {
            alert(t('error.generic'));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-background-dark border border-glass-edge rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 custom-finance-scroll">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-white">{invoiceToEdit ? t('finance.editInvoice') : t('finance.createInvoice')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-primary-start uppercase tracking-wider flex items-center gap-2">
                            <User size={16} /> {t('caseCard.client')}
                        </h3>
                        <div className="relative">
                            <label className="block text-sm text-gray-300 mb-1">{t('business.clientName')}</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                                <input 
                                    list="partners-list"
                                    required 
                                    type="text" 
                                    className="w-full bg-background-light border-glass-edge rounded-lg pl-9 pr-3 py-2 text-base sm:text-sm text-white focus:border-primary-start transition-all" 
                                    value={formData.client_name} 
                                    onChange={e => handleClientNameChange(e.target.value)} 
                                />
                                <datalist id="partners-list">
                                    {partners.map(p => <option key={p.id} value={p.name} />)}
                                </datalist>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-300 mb-1">{t('business.publicEmail')}</label>
                                <input type="email" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-base sm:text-sm text-white" value={formData.client_email} onChange={e => setFormData({...formData, client_email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-300 mb-1">{t('business.phone')}</label>
                                <input type="text" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-base sm:text-sm text-white" value={formData.client_phone} onChange={e => setFormData({...formData, client_phone: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-300 mb-1">{t('business.city')}</label>
                                <input type="text" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-base sm:text-sm text-white" value={formData.client_city} onChange={e => setFormData({...formData, client_city: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-300 mb-1">{t('business.taxId')}</label>
                                <input type="text" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-base sm:text-sm text-white" value={formData.client_tax_id} onChange={e => setFormData({...formData, client_tax_id: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">{t('business.address')}</label>
                            <input type="text" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-base sm:text-sm text-white" value={formData.client_address} onChange={e => setFormData({...formData, client_address: e.target.value})} />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
                                <input type="checkbox" id="vatToggle" checked={includeVat} onChange={(e) => setIncludeVat(e.target.checked)} className="w-4 h-4 text-primary-start rounded border-gray-300 focus:ring-primary-start" />
                                <label htmlFor="vatToggle" className="text-sm text-gray-300 cursor-pointer select-none">{t('finance.applyVat')}</label>
                            </div>
                            <div className="flex-1">
                                <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-primary-start outline-none appearance-none cursor-pointer">
                                    <option value="PAID" className="bg-gray-900">{t('status.PAID')}</option>
                                    <option value="PENDING" className="bg-gray-900">{t('status.PENDING')}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3 pt-4 border-t border-white/10">
                        <h3 className="text-sm font-bold text-primary-start uppercase tracking-wider flex items-center gap-2"><FileText size={16} /> {t('finance.services')}</h3>
                        {lineItems.map((item, index) => (
                            <div key={index} className="flex flex-col sm:flex-row gap-2 items-center border-b border-white/5 pb-2 sm:border-none sm:pb-0">
                                <input type="text" placeholder={t('finance.description')} className="flex-1 w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-base sm:text-sm text-white" value={item.description} onChange={e => updateLineItem(index, 'description', e.target.value)} required />
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <input type="number" placeholder={t('finance.qty')} className="w-1/2 sm:w-20 bg-background-light border-glass-edge rounded-lg px-3 py-2 text-base sm:text-sm text-white" value={item.quantity} onChange={e => updateLineItem(index, 'quantity', parseFloat(e.target.value))} min="1" />
                                    <input type="number" placeholder={t('finance.price')} className="w-1/2 sm:w-24 bg-background-light border-glass-edge rounded-lg px-3 py-2 text-base sm:text-sm text-white" value={item.unit_price} onChange={e => updateLineItem(index, 'unit_price', parseFloat(e.target.value))} min="0" />
                                </div>
                                <button type="button" onClick={() => removeLineItem(index)} className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg self-end sm:self-center"><Trash2 size={18} /></button>
                            </div>
                        ))}
                        <button type="button" onClick={addLineItem} className="text-sm text-primary-start hover:underline flex items-center gap-1"><Plus size={14} /> {t('finance.addLine')}</button>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400">{t('general.cancel')}</button>
                        <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold">{t('general.save')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};