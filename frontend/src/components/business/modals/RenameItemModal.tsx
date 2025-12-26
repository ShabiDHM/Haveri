// FILE: src/components/business/modals/RenameItemModal.tsx
// PHOENIX PROTOCOL - COMPONENT EXTRACTION V1.0
// Modal for renaming items.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Save, X } from 'lucide-react';
import { ArchiveItemOut } from '../../../data/types';

interface RenameItemModalProps {
    item: ArchiveItemOut | null;
    onClose: () => void;
    onSubmit: (id: string, newName: string) => void;
}

export const RenameItemModal: React.FC<RenameItemModalProps> = ({ item, onClose, onSubmit }) => {
    const { t } = useTranslation();
    const [name, setName] = useState("");

    useEffect(() => {
        if (item) setName(item.title);
    }, [item]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (item && name.trim()) {
            onSubmit(item.id, name);
            onClose();
        }
    };

    if (!item) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-background-dark border border-glass-edge rounded-3xl w-full max-w-sm p-5 sm:p-8 shadow-2xl scale-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">{t('documentsPanel.renameTitle')}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={24}/></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="relative mb-5">
                        <Pencil className="absolute left-4 top-3.5 w-5 h-5 text-blue-400" />
                        <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white text-base sm:text-lg focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium">{t('general.cancel')}</button>
                        <button type="submit" className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02] flex items-center gap-2">
                            <Save size={16} /> {t('general.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};