// FILE: src/components/business/TransactionImporter.tsx
// PHOENIX PROTOCOL - I18N V24.0 (DESIGN SYSTEM STANDARDIZED)
// MODIFIED: product_name is now required for POS imports

import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, ArrowRight, CheckCircle, AlertCircle, Loader2, ShoppingCart, Landmark } from 'lucide-react';
import { apiService, ImportPreviewResponse } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface TransactionImporterProps {
    onClose: () => void;
    onSuccess: () => void;
    t: (key: string, options?: any) => string;
}

type ImportType = 'pos' | 'bank';

export const TransactionImporter: React.FC<TransactionImporterProps> = ({ onClose, onSuccess, t }) => {
    const { workspace } = useAuth();
    const [step, setStep] = useState<'selection' | 'upload' | 'mapping' | 'processing'>('selection');
    const [importType, setImportType] = useState<ImportType>('pos');
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const posRequiredFields = [
        { key: 'amount', label: t('finance.amount'), required: true },
        { key: 'product_name', label: t('finance.import.productName'), required: true }, // NOW REQUIRED
        { key: 'date', label: t('finance.date'), required: false },
        { key: 'description', label: t('finance.description'), required: false },
        { key: 'category', label: t('finance.expenseCategory'), required: false },
        { key: 'Tipi', label: t('finance.import.typeLabel'), required: false },
        { key: 'status', label: t('finance.import.statusLabel'), required: false }
    ];

    const bankRequiredFields = [
        { key: 'description', label: t('finance.description'), required: true },
        { key: 'debit', label: t('finance.import.debit'), required: false },
        { key: 'credit', label: t('finance.import.credit'), required: false },
        { key: 'date', label: t('finance.date'), required: true },
    ];

    const requiredFields = importType === 'bank' ? bankRequiredFields : posRequiredFields;

    const handleSelectType = (type: ImportType) => {
        setImportType(type);
        setStep('upload');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setIsLoading(true);
        try {
            const data = await apiService.previewImport(uploadedFile);
            setPreviewData(data);
            
            const initialMapping: Record<string, string> = {};
            data.headers.forEach((header: string) => {
                const h = header.toLowerCase().trim();
                if (importType === 'bank') {
                    if (h.includes('description') || h.includes('përshkrim')) initialMapping[header] = 'description';
                    else if (h.includes('debit') || h.includes('dalje')) initialMapping[header] = 'debit';
                    else if (h.includes('credit') || h.includes('hyrje')) initialMapping[header] = 'credit';
                    else if (h.includes('dat') || h.includes('date')) initialMapping[header] = 'date';
                } else { // POS mapping
                    if (h.includes('shum') || h.includes('amount') || h.includes('price')) initialMapping[header] = 'amount';
                    else if (h.includes('dat') || h.includes('date')) initialMapping[header] = 'date';
                    else if (h.includes('përshkrim') || h.includes('desc')) initialMapping[header] = 'description';
                    else if (h.includes('produkt') || h.includes('product') || h.includes('emri i produktit')) initialMapping[header] = 'product_name';
                    else if (h.includes('kategori') || h.includes('cat')) initialMapping[header] = 'category';
                    else if (h.includes('tipi') || h.includes('type')) initialMapping[header] = 'Tipi';
                    else if (h.includes('status')) initialMapping[header] = 'status';
                }
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
    
    const handleSmartImport = async () => {
        if (!file || Object.keys(mapping).length === 0) return;
        setIsLoading(true);
        setStep('processing');
        
        try {
            await apiService.confirmImport(file, mapping, importType, workspace?.id);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Backend import failed:", error);
            alert(t('finance.import.importFailed'));
            setStep('mapping');
        } finally {
            setIsLoading(false);
        }
    };

    const updateMapping = (dbField: string, csvHeader: string) => {
        const newMapping = { ...mapping };
        Object.keys(newMapping).forEach(key => {
            if (newMapping[key] === dbField) delete newMapping[key];
        });
        if (csvHeader) newMapping[csvHeader] = dbField;
        setMapping(newMapping);
    };
    
    const getMappedHeader = (dbField: string) => Object.keys(mapping).find(key => mapping[key] === dbField) || "";
    
    const isMappingValid = () => {
        if (importType === 'bank') {
            return getMappedHeader('description') && getMappedHeader('date') && (getMappedHeader('debit') || getMappedHeader('credit'));
        }
        // POS: require amount and product_name
        return getMappedHeader('amount') && getMappedHeader('product_name');
    };

    return (
        <div className="fixed inset-0 bg-canvas/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <style>{`select option { background-color: var(--bg-card); color: var(--text-primary); }`}</style>
            <div className="glass-panel w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-xl">
                
                <div className="p-6 border-b border-border-main flex justify-between items-center">
                    <h2 className="text-xl font-bold text-text-primary flex items-center gap-3">
                        <FileSpreadsheet className="text-success-start" />
                        {t('finance.import.title')}
                    </h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1 hover:bg-hover rounded-lg">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 custom-finance-scroll">
                    {step === 'selection' && (
                        <div className="text-center py-10 space-y-6">
                            <h3 className="text-lg font-bold text-text-primary">{t('finance.import.selectTypeTitle')}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                                <button onClick={() => handleSelectType('pos')} 
                                    className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-surface border border-border-main hover:border-success-start/30 hover:bg-success-start/10 transition-all">
                                    <ShoppingCart size={32} className="text-success-start"/>
                                    <span className="font-bold text-text-primary">{t('finance.import.typePos')}</span>
                                </button>
                                <button onClick={() => handleSelectType('bank')} 
                                    className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-surface border border-border-main hover:border-primary-start/30 hover:bg-primary/10 transition-all">
                                    <Landmark size={32} className="text-primary"/>
                                    <span className="font-bold text-text-primary">{t('finance.import.typeBank')}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'upload' && (
                        <div className="text-center py-10 space-y-6">
                            <div className="w-24 h-24 bg-success-start/10 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-success-start/30">
                                <Upload size={36} className="text-success-start" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-primary">{importType === 'pos' ? t('finance.import.uploadTitlePos') : t('finance.import.uploadTitleBank')}</h3>
                                <p className="text-text-muted text-sm mt-1">{t('finance.import.uploadDesc')}</p>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv, .xlsx" />
                            <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} 
                                className="btn-primary w-full sm:w-auto px-8 py-4 flex items-center justify-center gap-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed rounded-xl">
                                {isLoading ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
                                {isLoading ? t('finance.import.analyzing') : t('finance.import.selectFile')}
                            </button>
                        </div>
                    )}

                    {step === 'mapping' && previewData && (
                        <div className="space-y-6">
                            <div className="bg-primary/10 border border-primary-start/30 p-4 rounded-xl flex gap-4 items-start">
                                <AlertCircle className="text-primary shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="text-primary font-bold text-sm">{t('finance.import.mappingTitle')}</p>
                                    <p className="text-text-muted text-xs mt-1">{t('finance.import.autoMapInfo')}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {requiredFields.map((field) => (
                                    <div key={field.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border-main">
                                        <label className="flex-1 font-bold text-text-primary text-sm flex items-center gap-2">
                                            {field.label}
                                            {field.required && <span className="text-danger-start text-xs font-mono">*</span>}
                                        </label>
                                        <div className="hidden sm:block"><ArrowRight className="text-border-main" size={16} /></div>
                                        <div className="flex-1">
                                            <select 
                                                className="glass-input w-full text-sm appearance-none cursor-pointer" 
                                                value={getMappedHeader(field.key)} 
                                                onChange={(e) => updateMapping(field.key, e.target.value)}
                                            >
                                                <option value="">{t('finance.import.columnSelect')}</option>
                                                {previewData.headers.map(h => (<option key={h} value={h}>{h}</option>))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {step === 'processing' && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center">
                            <Loader2 size={48} className="animate-spin text-success-start" />
                            <h3 className="text-xl font-bold text-text-primary">{t('finance.import.processingTitle')}</h3>
                            <p className="text-text-muted max-w-sm">{t('finance.import.processingDesc')}</p>
                        </div>
                    )}
                </div>

                {step === 'mapping' && (
                    <div className="p-6 border-t border-border-main flex justify-between items-center bg-surface/30">
                        <button onClick={() => { setStep('selection'); setFile(null); }} className="glass-input !bg-surface hover:bg-hover transition-colors px-6 py-3 rounded-xl">
                            {t('finance.import.back')}
                        </button>
                        <button onClick={handleSmartImport} disabled={!isMappingValid()} 
                            className="btn-primary px-8 py-3 flex items-center gap-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
                            <CheckCircle size={18} />
                            {t('finance.import.confirm')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};