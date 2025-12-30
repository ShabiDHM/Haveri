// FILE: src/components/business/TransactionImporter.tsx
// PHOENIX PROTOCOL - IMPORTER V20.0 (BACKEND DELEGATION FIX)
// 1. FIX: Deactivated the flawed 'processFileClientSide' function.
// 2. FIX: Rewired 'handleSmartImport' to correctly call the backend endpoint 'apiService.confirmImport'.
// 3. FIX: Ensures the 'mapping' object is sent in the correct format for the backend parsing service.
// 4. STATUS: This is the definitive fix that aligns frontend actions with backend capabilities.

import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiService, ImportPreviewResponse } from '../../services/api';

interface TransactionImporterProps {
    onClose: () => void;
    onSuccess: () => void;
    t: (key: string) => string;
}

export const TransactionImporter: React.FC<TransactionImporterProps> = ({ onClose, onSuccess, t }) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'processing'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
    // PHOENIX: Mapping state will be { [csvHeader]: dbField } e.g. { "Shuma": "amount" }
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const requiredFields = [
        { key: 'amount', label: t('finance.amount'), required: true },
        { key: 'date', label: t('finance.date'), required: false },
        { key: 'description', label: t('finance.description'), required: false },
        { key: 'product_name', label: t('finance.import.productName'), required: false }, 
        { key: 'category', label: t('finance.expenseCategory'), required: false },
        { key: 'Tipi', label: t('finance.import.typeLabel'), required: false }, // Note: Key is 'Tipi' to match backend
        { key: 'status', label: t('finance.import.statusLabel'), required: false }
    ];

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setIsLoading(true);
        try {
            const data = await apiService.previewImport(uploadedFile);
            setPreviewData(data);
            
            const initialMapping: Record<string, string> = {};
            data.headers.forEach(header => {
                const h = header.toLowerCase().trim();
                // Auto-map based on common Albanian/English headers
                if (h.includes('shum') || h.includes('amount') || h.includes('price')) initialMapping[header] = 'amount';
                else if (h.includes('dat') || h.includes('date')) initialMapping[header] = 'date';
                else if (h.includes('përshkrim') || h.includes('desc')) initialMapping[header] = 'description';
                else if (h.includes('produkt') || h.includes('product')) initialMapping[header] = 'product_name';
                else if (h.includes('kategori') || h.includes('cat')) initialMapping[header] = 'category';
                else if (h.includes('tipi') || h.includes('type')) initialMapping[header] = 'Tipi';
                else if (h.includes('status')) initialMapping[header] = 'status';
            });
            
            setMapping(initialMapping);
            setStep('mapping');
        } catch (error) {
            alert(t('error.generic'));
            setFile(null);
        } finally {
            setIsLoading(false);
        }
    };
    
    // PHOENIX: Rewired to use the robust backend importer
    const handleSmartImport = async () => {
        if (!file || Object.keys(mapping).length === 0) return;
        setIsLoading(true);
        setStep('processing');
        
        try {
            // This is the correct, robust backend-driven import
            await apiService.confirmImport(file, mapping);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Backend import failed:", error);
            alert(t('finance.import.importFailed'));
            setStep('mapping'); // Go back to mapping on failure
        } finally {
            setIsLoading(false);
        }
    };

    const updateMapping = (dbField: string, csvHeader: string) => {
        // Find if another dbField is using this csvHeader and clear it
        const newMapping = { ...mapping };
        Object.keys(newMapping).forEach(key => {
            if (newMapping[key] === dbField) {
                delete newMapping[key];
            }
        });

        // Set the new mapping if a column is selected
        if (csvHeader) {
            newMapping[csvHeader] = dbField;
        }
        setMapping(newMapping);
    };
    
    const getMappedHeader = (dbField: string) => {
        // Find which CSV header is mapped to our desired database field
        return Object.keys(mapping).find(key => mapping[key] === dbField) || "";
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <style>{`select option { background-color: #0f172a; color: #f9fafb; }`}</style>
            <div className="bg-[#0f172a] border border-emerald-500/20 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl shadow-emerald-900/20">
                
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <FileSpreadsheet className="text-emerald-400" />
                        {t('finance.import.title')}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 custom-finance-scroll">
                    {step === 'upload' && (
                        <div className="text-center py-10 space-y-6">
                            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                <Upload size={36} className="text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{t('finance.import.uploadTitle')}</h3>
                                <p className="text-gray-400 text-sm mt-1">{t('finance.import.uploadDesc')}</p>
                            </div>
                            
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv" />
                            
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading}
                                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mx-auto shadow-lg shadow-emerald-600/20 transform hover:scale-[1.02]"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
                                {isLoading ? t('finance.import.analyzing') : t('finance.import.selectFile')}
                            </button>
                        </div>
                    )}

                    {step === 'mapping' && previewData && (
                        <div className="space-y-6">
                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-4 items-start">
                                <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="text-blue-300 font-bold text-sm">{t('finance.import.mappingTitle')}</p>
                                    <p className="text-gray-400 text-xs mt-1">{t('finance.import.autoMapInfo')}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {requiredFields.map((field) => (
                                    <div key={field.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-900/40 p-4 rounded-xl border border-white/5">
                                        <label className="flex-1 font-bold text-white text-sm flex items-center gap-2">
                                            {field.label}
                                            {field.required && <span className="text-rose-400 text-xs font-mono">*</span>}
                                        </label>
                                        <div className="hidden sm:block"><ArrowRight className="text-gray-600" size={16} /></div>
                                        
                                        <div className="flex-1">
                                            <select 
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500/50 outline-none transition-all appearance-none cursor-pointer"
                                                value={getMappedHeader(field.key)}
                                                onChange={(e) => updateMapping(field.key, e.target.value)}
                                            >
                                                <option value="">{t('finance.import.columnSelect')}</option>
                                                {previewData.headers.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {step === 'processing' && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center">
                            <Loader2 size={48} className="animate-spin text-emerald-400" />
                            <h3 className="text-xl font-bold text-white">{t('finance.import.processingTitle')}</h3>
                            <p className="text-gray-400 max-w-sm">{t('finance.import.processingDesc')}</p>
                        </div>
                    )}
                </div>

                {step === 'mapping' && (
                    <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/30">
                        <button onClick={() => setStep('upload')} className="px-6 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors font-medium">{t('finance.import.back')}</button>
                        <button 
                            onClick={handleSmartImport}
                            disabled={!getMappedHeader('amount')} 
                            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                        >
                            <CheckCircle size={18} />
                            {t('finance.import.confirm')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};