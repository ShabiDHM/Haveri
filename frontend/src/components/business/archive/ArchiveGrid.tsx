// FILE: src/components/business/archive/ArchiveGrid.tsx
// PHOENIX PROTOCOL - ARCHIVE GRID V3.0 (WORKSPACE ALIGNMENT)
// 1. REBRAND: Renamed 'Case' to 'Workspace' throughout the grid and logic.
// 2. FIXED: Property access updated to use 'workspace_number'.
// 3. STATUS: Fully synchronized with the Single User Workspace model.

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArchiveCard, getFileIcon } from './ArchiveCard';
import { ArchiveItemOut, Workspace } from '../../../data/types'; // PHOENIX: Swapped Case for Workspace
import { Briefcase, FolderOpen } from 'lucide-react';

interface ArchiveGridProps {
    currentViewType: 'ROOT' | 'WORKSPACE' | 'FOLDER'; // PHOENIX: Updated view type
    filteredWorkspaces: Workspace[]; // PHOENIX: Renamed from filteredCases
    filteredItems: ArchiveItemOut[];
    openingDocId: string | null;
    onEnterFolder: (id: string, name: string, type: 'FOLDER' | 'WORKSPACE') => void;
    onViewItem: (item: ArchiveItemOut) => void;
    onDownload: (id: string, title: string) => void;
    onDelete: (id: string) => void;
    onRename: (item: ArchiveItemOut) => void;
    onShare: (item: ArchiveItemOut) => void;
}

export const ArchiveGrid: React.FC<ArchiveGridProps> = ({
    currentViewType, filteredWorkspaces, filteredItems, openingDocId,
    onEnterFolder, onViewItem, onDownload, onDelete, onRename, onShare
}) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-8 sm:space-y-10">
            {/* WORKSPACE SECTION (Only in Root) */}
            {currentViewType === 'ROOT' && filteredWorkspaces.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {filteredWorkspaces.map(w => {
                        // Guard against rendering workspaces without a valid ID
                        if (!w.id) return null;
                        return (
                            <div key={w.id} className="h-full">
                                <ArchiveCard 
                                    title={w.title || t('archive.myWorkspace')} 
                                    subtitle={w.workspace_number || 'ID-001'} 
                                    type={t('archive.myWorkspace')} 
                                    date={new Date(w.created_at).toLocaleDateString()} 
                                    icon={<Briefcase className="w-4 sm:w-5 h-4 sm:h-5 text-indigo-400" />} 
                                    isFolder={true} 
                                    isShared={w.is_shared}
                                    onClick={() => onEnterFolder(w.id, w.title, 'WORKSPACE')} 
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
                            if (!item || !item.id) {
                                console.warn("ArchiveGrid filtered a malformed item:", item);
                                return null;
                            }

                            const isFolder = item.item_type === 'FOLDER'; 
                            const fileExt = item.file_type || 'FILE'; 
                            
                            return (
                                <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={item.id} className="h-full">
                                    <ArchiveCard 
                                        title={item.title} 
                                        subtitle={isFolder ? t('archive.myWorkspace') : `${fileExt} Dokument`} 
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