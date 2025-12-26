// FILE: src/components/business/modals/ExpenseModal.tsx
// PHOENIX PROTOCOL - MODULE EXTRACTION V1.0
// Extracted from FinanceTab.tsx.
// Handles Create and Update operations for Expenses, including Receipt Upload.

import React, { useState, useEffect, useRef } from 'react';
import { X, MinusCircle, CheckCircle, Paperclip } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Expense, ExpenseCreateRequest, ExpenseUpdate } from '../../../data/types';
import { apiService } from '../../../services/api';
import * as ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { sq, enUS } from 'date-fns/locale';

const DatePicker = (ReactDatePicker as any).default;

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    expenseToEdit: Expense | null;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, onSuccess, expenseToEdit }) => {
    const { t, i18n } = useTranslation();
    const localeMap: { [key: string]: any } = { sq, al: sq, en: enUS };
    const currentLocale = localeMap[i18n.language] || enUS;
    const receiptInputRef = useRef<HTMLInputElement>(null);

    // State
    const [formData, setFormData] = useState({ 
        category: '', 
        amount: 0, 
        description: '' 
    });
    const [expenseDate, setExpenseDate] = useState<Date | null>(new Date());
    const [expenseReceipt, setExpenseReceipt] = useState<File | null>(null);

    // Initialize state on open
    useEffect(() => {
        if (isOpen) {
            if (expenseToEdit) {
                setFormData({
                    category: expenseToEdit.category,
                    amount: expenseToEdit.amount,
                    description: expenseToEdit.description || ''
                });
                setExpenseDate(new Date(expenseToEdit.date));
                setExpenseReceipt(null); // Reset file input
            } else {
                setFormData({ category: '', amount: 0, description: '' });
                setExpenseDate(new Date());
                setExpenseReceipt(null);
            }
        }
    }, [isOpen, expenseToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dateStr = expenseDate ? expenseDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            let savedExpenseId: string;

            if (expenseToEdit) {
                // Update
                const updatePayload: ExpenseUpdate = {
                    ...formData,
                    date: dateStr
                };
                const updated = await apiService.updateExpense(expenseToEdit.id, updatePayload);
                savedExpenseId = updated.id;
            } else {
                // Create
                const createPayload: ExpenseCreateRequest = {
                    ...formData,
                    date: dateStr
                };
                const created = await apiService.createExpense(createPayload);
                savedExpenseId = created.id;
            }

            // Handle Receipt Upload if exists
            if (expenseReceipt && savedExpenseId) {
                await apiService.uploadExpenseReceipt(savedExpenseId, expenseReceipt);
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Expense operation failed", error);
            alert(t('error.generic'));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-background-dark border border-glass-edge rounded-2xl w-full max-w-md p-4 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <MinusCircle size={20} className="text-rose-500" /> 
                        {expenseToEdit ? t('finance.editExpense') : t('finance.addExpense')}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                
                <div className="mb-6">
                    <input type="file" ref={receiptInputRef} className="hidden" accept="image/*,.pdf" onChange={(e) => setExpenseReceipt(e.target.files?.[0] || null)} />
                    <button 
                        type="button"
                        onClick={() => receiptInputRef.current?.click()} 
                        className={`w-full py-3 border border-dashed rounded-xl flex items-center justify-center gap-2 transition-all ${expenseReceipt ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                        {expenseReceipt ? (
                            <><CheckCircle size={18} /> {expenseReceipt.name}</>
                        ) : (
                            <><Paperclip size={18} /> {t('finance.attachReceipt')}</>
                        )}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">{t('finance.expenseCategory')}</label>
                        <input required type="text" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-base sm:text-sm text-white" 
                            value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} 
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">{t('finance.amount')}</label>
                        <input required type="number" step="0.01" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-base sm:text-sm text-white" 
                            value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} 
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">{t('finance.date')}</label>
                        <DatePicker 
                            selected={expenseDate} 
                            onChange={(date: Date | null) => setExpenseDate(date)} 
                            locale={currentLocale} 
                            dateFormat="dd/MM/yyyy" 
                            className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-base sm:text-sm text-white" 
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">{t('finance.description')}</label>
                        <textarea rows={2} className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-base sm:text-sm text-white" 
                            value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                        />
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400">{t('general.cancel')}</button>
                        <button type="submit" className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold">{t('general.save')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};