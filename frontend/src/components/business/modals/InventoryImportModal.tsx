// FILE: src/components/business/modals/InventoryImportModal.tsx
// PHOENIX PROTOCOL - CONTEXTUAL UI V4.0 (UNIFIED ADMIN AESTHETIC)
// 1. REFACTOR: Replaced internal logic with 'title' and 'requiredColumns' props.
// 2. UI: Modal now displays the exact instructions provided by its parent component.
// 3. UPDATED: Uses unified border styling

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, CheckCircle, Loader2, FileSpreadsheet, Info } from 'lucide-react';
import { apiService } from '../../../services/api';

interface InventoryImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    target: 'items' | 'recipes';
    title: string;
    requiredColumns: string;
}

export const InventoryImportModal: React.FC<InventoryImportModalProps> = ({ isOpen, onClose, onSuccess, target, title, requiredColumns }) => {
    const { t } = useTranslation();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImport = async () => {
        if (!file) return;
        setLoading(true);
        try {
            if (target === 'recipes') {
                const data = await apiService.importRecipes(file);
                alert(`${t('inventory.recipes.importedCount')}: ${data.recipes_created}`);
            } else {
                const data = await apiService.importInventoryItems(file);
                alert(`${t('inventory.items.importedCount', 'Items Imported')}: ${data.items_created || data.count || 'Success'}`);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert(t('error.generic'));
        } finally {
            setLoading(false);
            setFile(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-glass backdrop-blur-xl border border-border-strong rounded-2xl w-full max-w-md p-6 shadow-xl">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface mb-4">
                        <FileSpreadsheet className="w-6 h-6 text-success-start" />
                    </div>
                    <h3 className="text-xl font-bold text-text-primary mb-2">{title}</h3>
                    <p className="text-text-muted text-sm">
                        {t('inventory.import.instruction', 'Ngarkoni një skedar CSV ose Excel për të importuar të dhënat.')}
                    </p>
                </div>

                <div className="bg-surface rounded-lg p-3 border border-border-strong mb-6 text-left">
                    <div className="flex items-center gap-2 mb-2">
                        <Info size={12} className="text-primary" />
                        <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">{t('inventory.import.requiredStructure', 'Struktura e Kërkuar (CSV/Excel)')}</span>
                    </div>
                    <code className="text-xs font-mono text-text-secondary break-words block leading-relaxed">
                        {requiredColumns}
                    </code>
                </div>

                <div className="mb-6">
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx, .xls" onChange={(e) => setFile(e.target.files?.[0] || null)}/>
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className={`w-full py-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all group ${file ? 'border-success-start bg-success-start/5' : 'border-border-strong hover:border-success-start/50 hover:bg-hover'}`}
                    >
                        {file ? (
                            <>
                                <CheckCircle size={32} className="text-success-start" />
                                <span className="text-success-start font-medium text-sm px-4 truncate max-w-full">{file.name}</span>
                            </>
                        ) : (
                            <>
                                <Upload size={32} className="text-text-muted group-hover:text-success-start transition-colors" />
                                <span className="text-text-muted text-sm group-hover:text-text-primary transition-colors">{t('inventory.import.clickToSelect')}</span>
                            </>
                        )}
                    </button>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-text-muted hover:text-text-primary transition-colors">{t('general.cancel')}</button>
                    <button onClick={handleImport} disabled={!file || loading} className="btn-primary px-6 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {t('inventory.import.button', 'Importo Tani')}
                    </button>
                </div>
            </div>
        </div>
    );
};