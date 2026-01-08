// FILE: src/components/business/modals/ExpenseModal.tsx
// PHOENIX PROTOCOL - SUBTLE SCAN V2.4 (FULL RESTORATION)
// 1. RESTORATION: This is a complete, line-by-line restoration of the Subtle Scan feature.
// 2. TYPE FIX: Correctly handles 'null' vs 'undefined' for 'source_archive_id'.
// 3. VERIFICATION: All 'unused variable' and other TypeScript errors are resolved.

import React, { useState, useEffect, useRef } from 'react';
import { X, MinusCircle, CheckCircle, Paperclip, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Expense, ExpenseCreateRequest, ExpenseUpdate } from '../../../data/types';
import { apiService, API_V1_URL } from '../../../services/api';
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

type ExtractionStatus = 'IDLE' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, onSuccess, expenseToEdit }) => {
    const { t, i18n } = useTranslation();
    const localeMap: { [key: string]: any } = { sq, al: sq, en: enUS };
    const currentLocale = localeMap[i18n.language] || enUS;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({ category: '', amount: 0, description: '' });
    const [expenseDate, setExpenseDate] = useState<Date | null>(new Date());
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [extractionStatus, setExtractionStatus] = useState<ExtractionStatus>('IDLE');
    const [extractionError, setExtractionError] = useState<string | null>(null);
    const [sourceArchiveId, setSourceArchiveId] = useState<string | null>(null);

    const resetForm = (expense: Expense | null = null) => {
        if (expense) {
            setFormData({ category: expense.category, amount: expense.amount, description: expense.description || '' });
            setExpenseDate(new Date(expense.date));
            setSourceArchiveId(expense.source_archive_id || null);
        } else {
            setFormData({ category: '', amount: 0, description: '' });
            setExpenseDate(new Date());
            setSourceArchiveId(null);
        }
        setSelectedFile(null);
        setExtractionStatus('IDLE');
        setExtractionError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    useEffect(() => { if (isOpen) { resetForm(expenseToEdit); } }, [isOpen, expenseToEdit]);

    useEffect(() => {
        if (!isOpen) return;
        const abortController = new AbortController();
        const token = apiService.getToken();
        if (!token) return;

        const setupStream = async () => {
            try {
                const response = await fetch(`${API_V1_URL}/archive/events`, { headers: { 'Authorization': `Bearer ${token}` }, signal: abortController.signal });
                if (!response.ok || !response.body) return;
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n\n');
                    for (const line of lines) {
                        if (line.trim().startsWith('data: ')) {
                            try {
                                const eventData = JSON.parse(line.trim().substring(6));
                                if (eventData.type === 'EXPENSE_EXTRACTION_COMPLETE' && eventData.archive_item_id === sourceArchiveId) {
                                    setExtractionStatus('COMPLETED');
                                    const data = eventData.data;
                                    setFormData(prev => ({ ...prev, category: data.category || prev.category, amount: data.total_amount || prev.amount, description: data.supplier_name || prev.description }));
                                    if (data.date) setExpenseDate(new Date(data.date));
                                } else if (eventData.type === 'EXPENSE_EXTRACTION_FAILED' && eventData.archive_item_id === sourceArchiveId) {
                                    setExtractionStatus('FAILED');
                                    setExtractionError(eventData.error || t('error.generic'));
                                }
                            } catch (e) { /* ignore */ }
                        }
                    }
                }
            } catch (err: any) { if (err.name !== 'AbortError') console.warn("SSE Stream disconnected:", err); }
        };
        setupStream();
        return () => abortController.abort();
    }, [isOpen, t, sourceArchiveId]);

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setExtractionStatus('UPLOADING');
        setExtractionError(null);
        try {
            const token = apiService.getToken();
            const formPayload = new FormData();
            formPayload.append('file', file);
            const response = await fetch(`${API_V1_URL}/analysis/extract-expense-from-file`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formPayload });
            if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || 'Upload failed'); }
            const data = await response.json();
            setSourceArchiveId(data.archive_item_id);
            setExtractionStatus('PROCESSING');
        } catch (error: any) {
            setExtractionStatus('FAILED');
            setExtractionError(error.message || t('error.generic'));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dateStr = expenseDate ? expenseDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            const source_id = sourceArchiveId || undefined;
            if (expenseToEdit) {
                const payload: ExpenseUpdate = { ...formData, date: dateStr, source_archive_id: source_id || expenseToEdit.source_archive_id };
                await apiService.updateExpense(expenseToEdit.id, payload);
            } else {
                const payload: ExpenseCreateRequest = { ...formData, date: dateStr, source_archive_id: source_id };
                await apiService.createExpense(payload);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Expense operation failed", error);
            alert(t('error.generic'));
        }
    };

    const getButtonContent = () => {
        switch (extractionStatus) {
            case 'UPLOADING': return <><Loader2 size={18} className="animate-spin"/> {t('finance.uploading')}...</>;
            case 'PROCESSING': return <><Loader2 size={18} className="animate-spin"/> {t('finance.analyzing')}...</>;
            case 'COMPLETED': return <><CheckCircle size={18} /> {selectedFile?.name || t('finance.dataExtracted')}</>;
            case 'FAILED': return <><X size={18} /> {t('finance.extractionFailed')}</>;
            default: return <><Paperclip size={18} /> {selectedFile ? selectedFile.name : t('finance.attachReceipt')}</>;
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-background-dark border border-glass-edge rounded-2xl w-full max-w-md p-4 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><MinusCircle size={20} className="text-rose-500" />{expenseToEdit ? t('finance.editExpense') : t('finance.addExpense')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <div className="mb-6">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileSelected} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={extractionStatus === 'UPLOADING' || extractionStatus === 'PROCESSING'} className={`w-full py-3 border border-dashed rounded-xl flex items-center justify-center gap-2 transition-all ${extractionStatus === 'COMPLETED' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'} disabled:opacity-50`}>
                        {getButtonContent()}
                    </button>
                    {extractionError && <p className="text-xs text-red-400 mt-2">{extractionError}</p>}
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">{t('finance.expenseCategory')}</label>
                        <input required type="text" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-base sm:text-sm text-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">{t('finance.amount')}</label>
                        <input required type="number" step="0.01" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-base sm:text-sm text-white" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">{t('finance.date')}</label>
                        <DatePicker selected={expenseDate} onChange={(date: Date | null) => setExpenseDate(date)} locale={currentLocale} dateFormat="dd/MM/yyyy" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-base sm:text-sm text-white" required />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">{t('finance.description')}</label>
                        <textarea rows={2} className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-base sm:text-sm text-white" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
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