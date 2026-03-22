// FILE: src/components/business/modals/RenameItemModal.tsx
// PHOENIX PROTOCOL - COMPONENT EXTRACTION V4.0 (DESIGN SYSTEM STANDARDIZED)
// Modal for renaming items.
// STATUS: VERIFIED - COMPLETE FILE REPLACEMENT

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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="glass-panel w-full max-w-sm p-5 sm:p-8 shadow-xl scale-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-text-primary">{t('documentsPanel.renameTitle')}</h3>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={24}/></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="relative mb-5">
                        <Pencil className="absolute left-4 top-3.5 w-5 h-5 text-primary" />
                        <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} className="glass-input w-full pl-12 py-3.5 text-base sm:text-lg" />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl text-text-muted hover:text-text-primary glass-input !bg-surface hover:bg-hover transition-colors font-medium">
                            {t('general.cancel')}
                        </button>
                        <button type="submit" className="btn-primary px-8 py-3 flex items-center gap-2 rounded-xl">
                            <Save size={16} /> {t('general.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};