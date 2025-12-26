// FILE: src/components/business/modals/InventoryImportModal.tsx
// PHOENIX PROTOCOL - UI POLISH V1.3
// 1. FIX: Removed ugly horizontal scrollbar.
// 2. UI: Formatted column instructions as a clean code block.
// 3. STATUS: Production Ready.

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, CheckCircle, Loader2, FileSpreadsheet, Info } from 'lucide-react';
import { apiService } from '../../../services/api';

interface InventoryImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    target: 'items' | 'recipes';
}

export const InventoryImportModal: React.FC<InventoryImportModalProps> = ({ isOpen, onClose, onSuccess, target }) => {
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
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-background-dark border border-glass-edge rounded-2xl w-full max-w-md p-6">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-4">
                        <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                        {target === 'recipes' ? t('inventory.recipes.import') : t('inventory.items.import', 'Import Inventory Items')}
                    </h3>
                    <p className="text-gray-400 text-sm">
                        {t('inventory.import.instruction')}
                    </p>
                </div>

                {/* Professional Code Block for Columns */}
                <div className="bg-black/40 rounded-lg p-3 border border-white/10 mb-6 text-left">
                    <div className="flex items-center gap-2 mb-2">
                        <Info size={12} className="text-blue-400" />
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Struktura e Kërkuar (CSV/Excel)</span>
                    </div>
                    <code className="text-xs font-mono text-gray-300 break-words block leading-relaxed">
                        {target === 'recipes' 
                            ? t('inventory.import.columns') 
                            : t('inventory.import.columnsItems')
                        }
                    </code>
                </div>

                <div className="mb-6">
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx, .xls" onChange={(e) => setFile(e.target.files?.[0] || null)}/>
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className={`w-full py-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all group ${file ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 hover:border-emerald-500/50 hover:bg-white/5'}`}
                    >
                        {file ? (
                            <>
                                <CheckCircle size={32} className="text-emerald-400" />
                                <span className="text-emerald-400 font-medium text-sm px-4 truncate max-w-full">{file.name}</span>
                            </>
                        ) : (
                            <>
                                <Upload size={32} className="text-gray-500 group-hover:text-emerald-400 transition-colors" />
                                <span className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">{t('inventory.import.clickToSelect')}</span>
                            </>
                        )}
                    </button>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">{t('general.cancel')}</button>
                    <button onClick={handleImport} disabled={!file || loading} className="px-6 py-2 bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20">
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {t('inventory.import.button')}
                    </button>
                </div>
            </div>
        </div>
    );
};