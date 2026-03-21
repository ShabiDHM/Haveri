// FILE: src/components/business/modals/CreateFolderModal.tsx
// PHOENIX PROTOCOL - COMPONENT EXTRACTION V3.0 (UNIFIED ADMIN AESTHETIC)
// Modal for creating new archive folders.
// UPDATED: Uses unified border styling

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Tag, X } from 'lucide-react';

interface CreateFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, category: string) => void;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const { t } = useTranslation();
    const [name, setName] = useState("");
    const [category, setCategory] = useState("GENERAL");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSubmit(name, category);
            setName("");
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-glass backdrop-blur-xl border border-border-strong rounded-3xl w-full max-w-sm p-5 sm:p-8 shadow-xl scale-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-text-primary">{t('archive.newFolderTitle')}</h3>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={24}/></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="relative mb-5">
                        <FolderOpen className="absolute left-4 top-3.5 w-6 h-6 text-warning-start" />
                        <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('archive.folderNamePlaceholder')} className="glass-input w-full pl-12 py-3.5 text-base sm:text-lg" />
                    </div>
                    <div className="relative mb-8">
                        <Tag className="absolute left-4 top-3.5 w-5 h-5 text-text-muted" />
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className="glass-input w-full pl-12 py-3.5 text-base sm:text-lg appearance-none cursor-pointer">
                            <option value="GENERAL">{t('category.general')}</option>
                            <option value="EVIDENCE">{t('category.evidence')}</option>
                            <option value="LEGAL_DOCS">{t('category.legalDocs')}</option>
                            <option value="INVOICES">{t('category.invoices')}</option>
                            <option value="CONTRACTS">{t('category.contracts')}</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl text-text-muted hover:text-text-primary hover:bg-hover transition-colors font-medium">{t('general.cancel')}</button>
                        <button type="submit" className="btn-primary px-8 py-3">{t('general.create')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};