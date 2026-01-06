// FILE: src/components/business/archive/ArchiveGrid.tsx
// PHOENIX PROTOCOL - STATE RECONCILIATION FIX V2.0
// 1. FIX: Added a "Guard Clause" to the .map() function. This makes it impossible for React to render a card
//    if 'item.id' is missing, preventing the creation of "ghost" components with stale, undefined IDs.
// 2. STATUS: This is the definitive frontend fix that enforces component integrity and resolves the root cause
//    of the stale state reconciliation failure.

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
                    {filteredCases.map(c => {
                        // Guard against rendering cases without a valid ID
                        if (!c.id) return null;
                        return (
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
                        );
                    })}
                </div>
            )}

            {/* FILES & FOLDERS SECTION */}
            {filteredItems.length > 0 && (
                <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    <AnimatePresence>
                        {filteredItems.map(item => { 
                            // PHOENIX FIX: This guard clause prevents rendering if the ID is missing.
                            // This stops React from creating a component with an invalid key and stale event handlers.
                            if (!item || !item.id) {
                                console.warn("ArchiveGrid is filtering a malformed item without an ID:", item);
                                return null;
                            }

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