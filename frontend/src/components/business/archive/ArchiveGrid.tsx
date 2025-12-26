// FILE: src/components/business/archive/ArchiveGrid.tsx
// PHOENIX PROTOCOL - COMPONENT EXTRACTION V1.0
// Renders grid of Cases and Archive Items.

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArchiveCard, getFileIcon } from './ArchiveCard';
import { ArchiveItemOut, Case } from '../../../data/types';
import { Briefcase, FolderOpen } from 'lucide-react';

interface ArchiveGridProps {
    currentViewType: 'ROOT' | 'CASE' | 'FOLDER';
    filteredCases: Case[];
    filteredItems: ArchiveItemOut[];
    openingDocId: string | null;
    onEnterFolder: (id: string, name: string, type: 'FOLDER' | 'CASE') => void;
    onViewItem: (item: ArchiveItemOut) => void;
    onDownload: (id: string, title: string) => void;
    onDelete: (id: string) => void;
    onRename: (item: ArchiveItemOut) => void;
    onShare: (item: ArchiveItemOut) => void;
}

export const ArchiveGrid: React.FC<ArchiveGridProps> = ({
    currentViewType, filteredCases, filteredItems, openingDocId,
    onEnterFolder, onViewItem, onDownload, onDelete, onRename, onShare
}) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-8 sm:space-y-10">
            {/* CASES SECTION (Only in Root) */}
            {currentViewType === 'ROOT' && filteredCases.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {filteredCases.map(c => (
                        <div key={c.id} className="h-full">
                            <ArchiveCard 
                                title={c.title || `Projekti #${c.case_number}`} 
                                subtitle={c.case_number || 'Pa numër'} 
                                type="Dosje Projekti" 
                                date={new Date(c.created_at).toLocaleDateString()} 
                                icon={<Briefcase className="w-4 sm:w-5 h-4 sm:h-5 text-indigo-400" />} 
                                isFolder={true} 
                                isShared={c.is_shared}
                                onClick={() => onEnterFolder(c.id, c.title, 'CASE')} 
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* FILES & FOLDERS SECTION */}
            {filteredItems.length > 0 && (
                <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    <AnimatePresence>
                        {filteredItems.map(item => { 
                            const isFolder = item.item_type === 'FOLDER'; 
                            const fileExt = item.file_type || 'FILE'; 
                            return (
                                <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={item.id} className="h-full">
                                    <ArchiveCard 
                                        title={item.title} 
                                        subtitle={isFolder ? t('archive.caseFolders') : `${fileExt} Dokument`} 
                                        type={isFolder ? 'Folder' : fileExt} 
                                        date={new Date(item.created_at).toLocaleDateString()} 
                                        icon={isFolder ? <FolderOpen className="w-4 sm:w-5 h-4 sm:h-5 text-amber-500" /> : getFileIcon(fileExt)} 
                                        isFolder={isFolder} 
                                        isShared={item.is_shared}
                                        isLoading={openingDocId === item.id}
                                        onClick={() => isFolder ? onEnterFolder(item.id, item.title, 'FOLDER') : onViewItem(item)} 
                                        onDownload={() => onDownload(item.id, item.title)} 
                                        onDelete={() => onDelete(item.id)}
                                        onRename={() => onRename(item)} 
                                        onShare={() => onShare(item)}
                                    />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
};