// FILE: src/components/business/modals/InventoryImportModal.tsx
// PHOENIX PROTOCOL - SYNC V1.2
// Ensuring export visibility.

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, CheckCircle, Loader2 } from 'lucide-react';
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
            <div className="bg-background-dark border border-glass-edge rounded-2xl w-full max-w-md p-6 text-center">
                <h3 className="text-xl font-bold text-white mb-2">
                    {target === 'recipes' ? t('inventory.recipes.import') : t('inventory.items.import', 'Import Inventory Items')}
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                    {t('inventory.import.instruction')} <br/>
                    <span className="font-mono text-xs bg-white/5 px-1 rounded block mt-2 overflow-x-auto whitespace-nowrap">
                        {target === 'recipes' 
                            ? t('inventory.import.columns') 
                            : t('inventory.import.columnsItems')
                        }
                    </span>
                </p>
                <div className="mb-6">
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx, .xls" onChange={(e) => setFile(e.target.files?.[0] || null)}/>
                    <button onClick={() => fileInputRef.current?.click()} className={`w-full py-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${file ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}>
                        {file ? (
                            <><CheckCircle size={32} className="text-emerald-400" /><span className="text-emerald-400 font-medium">{file.name}</span></>
                        ) : (
                            <><Upload size={32} className="text-gray-500" /><span className="text-gray-400 text-sm">{t('inventory.import.clickToSelect')}</span></>
                        )}
                    </button>
                </div>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-400">{t('general.cancel')}</button>
                    <button onClick={handleImport} disabled={!file || loading} className="px-6 py-2 bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-2">
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {t('inventory.import.button')}
                    </button>
                </div>
            </div>
        </div>
    );
};