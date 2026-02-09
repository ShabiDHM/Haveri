// FILE: src/components/business/modals/ExpenseModal.tsx
// PHOENIX PROTOCOL - V3.2 (CLEANUP)
// 1. CLEANUP: Removed unused imports to resolve TS6133 warnings.
// 2. STATUS: Fully synchronized with Partner database.

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode.react';
import { X, MinusCircle, CheckCircle, Paperclip, Loader2, Smartphone, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Expense, Partner } from '../../../data/types';
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

    const [partners, setPartners] = useState<Partner[]>([]);
    const [formData, setFormData] = useState({ category: '', amount: 0, description: '' });
    const [expenseDate, setExpenseDate] = useState<Date | null>(new Date());
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [extractionStatus, setExtractionStatus] = useState<ExtractionStatus>('IDLE');
    const [extractionError, setExtractionError] = useState<string | null>(null);
    const [sourceArchiveId, setSourceArchiveId] = useState<string | null>(null);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [handoffToken, setHandoffToken] = useState<string | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isOpen) {
            apiService.getPartners().then(data => {
                setPartners(data.filter(p => p.type === 'SUPPLIER'));
            });
        }
    }, [isOpen]);

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
        if (isQrModalOpen && handoffToken) {
            pollingIntervalRef.current = setInterval(async () => {
                try {
                    const { status, filename } = await apiService.getHandoffStatus(handoffToken);
                    if (status === 'complete' && filename) {
                        const fileData = await apiService.retrieveHandoffFile(handoffToken, filename);
                        triggerExtraction(fileData);
                        closeQrModal();
                    }
                } catch (error) { console.error("Handoff polling error:", error); }
            }, 3000);
        }
        return () => { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); };
    }, [isQrModalOpen, handoffToken]);
    
    useEffect(() => {
        if (!isOpen || !sourceArchiveId) return;
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
                            } catch (e) { }
                        }
                    }
                }
            } catch (err: any) { if (err.name !== 'AbortError') console.warn("SSE Stream disconnected:", err); }
        };
        setupStream();
        return () => abortController.abort();
    }, [isOpen, t, sourceArchiveId]);

    const triggerExtraction = async (file: File) => {
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

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) triggerExtraction(file);
    };
    
    const startHandoff = async () => {
        try {
            const { token } = await apiService.createHandoffSession();
            setHandoffToken(token);
            setIsQrModalOpen(true);
        } catch (error) { alert("Dështoi krijimi i sesionit për celular."); }
    };

    const closeQrModal = () => {
        setIsQrModalOpen(false);
        setHandoffToken(null);
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dateStr = expenseDate ? expenseDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            const source_id = sourceArchiveId || undefined;
            if (expenseToEdit) {
                await apiService.updateExpense(expenseToEdit.id, { ...formData, date: dateStr, source_archive_id: source_id || expenseToEdit.source_archive_id });
            } else {
                await apiService.createExpense({ ...formData, date: dateStr, source_archive_id: source_id });
            }
            onSuccess();
            onClose();
        } catch (error) { alert(t('error.generic')); }
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
        <>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-background-dark border border-glass-edge rounded-2xl w-full max-w-md p-4 sm:p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><MinusCircle size={20} className="text-rose-500" />{expenseToEdit ? t('finance.editExpense') : t('finance.addExpense')}</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                    </div>
                    <div className="mb-6 flex items-center gap-2">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileSelected} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={extractionStatus === 'UPLOADING' || extractionStatus === 'PROCESSING'} className={`flex-1 py-3 border border-dashed rounded-xl flex items-center justify-center gap-2 transition-all ${extractionStatus === 'COMPLETED' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'} disabled:opacity-50`}>
                            {getButtonContent()}
                        </button>
                        <button type="button" title={t('finance.scanFromPhone')} onClick={startHandoff} className="p-3 border border-dashed rounded-xl bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20 transition-all">
                            <Smartphone size={24} />
                        </button>
                    </div>
                    {extractionError && <p className="text-xs text-red-400 -mt-4 mb-4">{extractionError}</p>}
                    
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
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                                <input 
                                    list="suppliers-list"
                                    type="text" 
                                    className="w-full bg-background-light border-glass-edge rounded-lg pl-9 pr-3 py-2 text-base sm:text-sm text-white focus:border-rose-500 transition-all" 
                                    value={formData.description} 
                                    onChange={e => setFormData({...formData, description: e.target.value})} 
                                />
                                <datalist id="suppliers-list">
                                    {partners.map(p => <option key={p.id} value={p.name} />)}
                                </datalist>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400">{t('general.cancel')}</button>
                            <button type="submit" className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold">{t('general.save')}</button>
                        </div>
                    </form>
                </div>
            </div>
            {isQrModalOpen && handoffToken && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1f2937] border border-white/10 p-8 rounded-2xl w-full max-w-sm shadow-2xl text-center relative">
                        <button onClick={closeQrModal} className="absolute top-3 right-3 p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full"><X size={18} /></button>
                        <h3 className="text-xl font-bold text-white mb-2">Skano për të Ngarkuar</h3>
                        <p className="text-gray-400 mb-6">Përdorni kamerën e celularit tuaj për të hapur linkun e sigurt të ngarkimit.</p>
                        <div className="bg-white p-4 rounded-lg inline-block"><QRCode value={`${window.location.origin}/mobile-upload/${handoffToken}`} size={200} /></div>
                        <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 animate-pulse"><Loader2 className="w-4 h-4 animate-spin"/> Duke pritur për skedarin...</div>
                    </motion.div>
                </div>
            )}
        </>
    );
};