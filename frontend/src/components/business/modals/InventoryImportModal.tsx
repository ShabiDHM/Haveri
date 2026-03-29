// FILE: src/components/business/modals/InventoryImportModal.tsx
// PHOENIX PROTOCOL - CONTEXTUAL UI V5.2 (RECIPE IMPORT FIX)

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, CheckCircle, Loader2, FileSpreadsheet, Info } from 'lucide-react';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { InventoryItem } from '../../../data/types';
import * as XLSX from 'xlsx';

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
    const { workspace } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && target === 'recipes') {
            apiService.getInventoryItems(workspace?.id).then(setInventoryItems);
        }
    }, [isOpen, target, workspace?.id]);

    const parseFile = async (file: File): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result;
                let rows: any[] = [];
                if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                } else {
                    const text = data as string;
                    const lines = text.split(/\r?\n/);
                    rows = lines.map(line => line.split(',').map(cell => cell.trim()));
                }
                if (rows.length < 2) reject('File is empty');
                const firstRow = rows[0];
                const isHeader = firstRow.some((cell: string) => 
                    ['product', 'emri', 'name', 'ingredient', 'quantity'].some(keyword => 
                        String(cell).toLowerCase().includes(keyword)
                    )
                );
                const startIndex = isHeader ? 1 : 0;
                const result = [];
                for (let i = startIndex; i < rows.length; i++) {
                    const row = rows[i];
                    if (row.length < 3) continue;
                    result.push({
                        product_name: String(row[0] || '').trim(),
                        ingredient_name: String(row[1] || '').trim(),
                        quantity_required: parseFloat(String(row[2] || '0').replace(',', '.'))
                    });
                }
                resolve(result);
            };
            reader.onerror = reject;
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                reader.readAsBinaryString(file);
            } else {
                reader.readAsText(file, 'UTF-8');
            }
        });
    };

    const handleImport = async () => {
        if (!file) return;
        setLoading(true);
        try {
            if (target === 'recipes') {
                const parsedData = await parseFile(file);
                if (!parsedData.length) throw new Error('No data found');

                const inventoryMap = new Map<string, string>();
                inventoryItems.forEach(item => {
                    inventoryMap.set(item.name.toLowerCase().trim(), item._id);
                });

                const missingIngredients = new Set<string>();
                const processedRows = [];

                for (const row of parsedData) {
                    const ingredientName = row.ingredient_name?.toLowerCase().trim();
                    const invId = ingredientName ? inventoryMap.get(ingredientName) : null;
                    if (!invId) {
                        missingIngredients.add(row.ingredient_name);
                        continue;
                    }
                    processedRows.push({
                        product_name: row.product_name,
                        inventory_item_id: invId,
                        quantity_required: row.quantity_required,
                    });
                }

                if (processedRows.length === 0) {
                    alert('No valid rows: none of the ingredient names match existing inventory items.');
                    return;
                }
                if (missingIngredients.size > 0) {
                    alert(`Warning: The following ingredients were not found and were skipped: ${Array.from(missingIngredients).join(', ')}`);
                }

                // Reconstruct a CSV-like structure for the backend (the backend expects ingredient names, not IDs)
                // Actually, the backend import_recipes_bulk already maps names to IDs. So we can just send the original file.
                // To avoid complexity, we'll send the original file and rely on backend mapping.
                await apiService.importRecipes(file, workspace?.id);
            } else {
                await apiService.importInventoryItems(file, workspace?.id);
            }
            alert(t('general.saveSuccess'));
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
        <div className="fixed inset-0 bg-canvas/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel w-full max-w-md p-6 shadow-xl">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface mb-4">
                        <FileSpreadsheet className="w-6 h-6 text-success-start" />
                    </div>
                    <h3 className="text-xl font-bold text-text-primary mb-2">{title}</h3>
                    <p className="text-text-muted text-sm">
                        {t('inventory.import.instruction', 'Ngarkoni një skedar CSV ose Excel për të importuar të dhënat.')}
                    </p>
                </div>

                <div className="bg-surface rounded-lg p-3 border border-border-main mb-6 text-left">
                    <div className="flex items-center gap-2 mb-2">
                        <Info size={12} className="text-primary" />
                        <span className="text-xs font-black uppercase tracking-widest text-text-muted">{t('inventory.import.requiredStructure', 'Struktura e Kërkuar (CSV/Excel)')}</span>
                    </div>
                    <code className="text-xs font-mono text-text-secondary break-words block leading-relaxed">
                        {requiredColumns}
                    </code>
                    {target === 'recipes' && (
                        <p className="text-xs text-text-muted mt-2">
                            * Emri i përbërësit duhet të përputhet saktësisht me emrin e artikullit në inventar.
                        </p>
                    )}
                </div>

                <div className="mb-6">
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx, .xls" onChange={(e) => setFile(e.target.files?.[0] || null)}/>
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className={`w-full py-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all group ${file ? 'border-success-start bg-success-start/5' : 'border-border-main hover:border-success-start/30 hover:bg-hover'}`}
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
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-text-muted hover:text-text-primary glass-input !bg-surface hover:bg-hover transition-colors">
                        {t('general.cancel')}
                    </button>
                    <button onClick={handleImport} disabled={!file || loading} className="btn-primary px-6 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl">
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {t('inventory.import.button', 'Importo Tani')}
                    </button>
                </div>
            </div>
        </div>
    );
};