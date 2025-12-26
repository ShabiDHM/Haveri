// FILE: src/components/business/modals/CreateFolderModal.tsx
// PHOENIX PROTOCOL - COMPONENT EXTRACTION V1.0
// Modal for creating new archive folders.

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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-background-dark border border-glass-edge rounded-3xl w-full max-w-sm p-5 sm:p-8 shadow-2xl scale-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">{t('archive.newFolderTitle')}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={24}/></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="relative mb-5">
                        <FolderOpen className="absolute left-4 top-3.5 w-6 h-6 text-amber-500" />
                        <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('archive.folderNamePlaceholder')} className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white text-base sm:text-lg focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder:text-gray-600" />
                    </div>
                    <div className="relative mb-8">
                        <Tag className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-gray-300 focus:ring-2 focus:ring-amber-500/50 outline-none appearance-none cursor-pointer text-base sm:text-lg">
                            <option value="GENERAL">{t('category.general')}</option>
                            <option value="EVIDENCE">{t('category.evidence')}</option>
                            <option value="LEGAL_DOCS">{t('category.legalDocs')}</option>
                            <option value="INVOICES">{t('category.invoices')}</option>
                            <option value="CONTRACTS">{t('category.contracts')}</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium">{t('general.cancel')}</button>
                        <button type="submit" className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all transform hover:scale-[1.02]">{t('general.create')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};