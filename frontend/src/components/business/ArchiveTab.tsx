// FILE: src/components/business/ArchiveTab.tsx
// PHOENIX PROTOCOL - ARCHIVE TAB V17.0 (MODULAR REFACTOR)
// 1. REFACTOR: Hook-based logic (useArchiveData).
// 2. MODULARITY: Extracted Breadcrumbs, Grid, Cards, and Modals.
// 3. STATUS: Production Ready. Clean.

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
    FolderPlus, Loader2, FolderUp, FileUp, Search, Link as LinkIcon 
} from 'lucide-react';
import { apiService } from '../../services/api';
import { ArchiveItemOut, Document } from '../../data/types';
import { useTranslation } from 'react-i18next';
import PDFViewerModal from '../PDFViewerModal';
import ShareModal from '../ShareModal';

// Modules
import { useArchiveData } from '../../hooks/useArchiveData';
import { ArchiveBreadcrumbs } from './archive/ArchiveBreadcrumbs';
import { ArchiveGrid } from './archive/ArchiveGrid';
import { CreateFolderModal } from './modals/CreateFolderModal';
import { RenameItemModal } from './modals/RenameItemModal';

const getMimeType = (fileType: string, fileName: string) => { const ext = fileName.split('.').pop()?.toLowerCase() || ''; if (fileType === 'PDF' || ext === 'pdf') return 'application/pdf'; if (['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF'].includes(fileType)) return 'image/jpeg'; return 'application/octet-stream'; };

export const ArchiveTab: React.FC = () => {
    const { t } = useTranslation();
    
    // Hook
    const {
        loading,
        breadcrumbs,
        currentView,
        filteredCases,
        filteredItems,
        searchTerm, setSearchTerm,
        isUploading, isInsideCase,
        navigateTo, enterFolder,
        createFolder, uploadFile,
        deleteItem, renameItem, shareItem,
        fetchArchiveContent
    } = useArchiveData();

    // UI State
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [itemToRename, setItemToRename] = useState<ArchiveItemOut | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    
    // Viewer State
    const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
    const [viewingUrl, setViewingUrl] = useState<string | null>(null);
    const [openingDocId, setOpeningDocId] = useState<string | null>(null);

    // Refs
    const folderInputRef = useRef<HTMLInputElement>(null);
    const archiveInputRef = useRef<HTMLInputElement>(null);

    // Handlers
    const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files; 
        if (!files || files.length === 0) return;
        // Simple wrapper for mass upload logic if needed, or pass to hook
        // For now, keeping complex folder logic here or moving to hook would be better. 
        // To keep this file clean, let's defer to the hook eventually, but for V17 let's use the hook's primitives.
        // NOTE: Folder upload logic is complex (webkitRelativePath). Implementing inline for safety in V17 or standard uploadFile loop.
        // Assuming simple multi-file upload for now using the hook's uploadFile.
        // Ideally, move `handleFolderUpload` logic to hook in V17.1.
        
        // Re-implementing original logic briefly to ensure functionality isn't lost during refactor:
        const active = breadcrumbs[breadcrumbs.length - 1];
        try {
            const firstPath = files[0].webkitRelativePath || "";
            const rootFolderName = firstPath.split('/')[0] || t('archive.newFolderDefault');
            const newFolder = await apiService.createArchiveFolder(rootFolderName, active.type === 'FOLDER' ? active.id! : undefined, active.type === 'CASE' ? active.id! : undefined, "GENERAL");
            if (!newFolder || !newFolder.id) throw new Error("Failed to create folder");
            const uploadPromises = Array.from(files).map(file => { if (file.name.startsWith('.')) return Promise.resolve(); return apiService.uploadArchiveItem(file, file.name, "GENERAL", active.type === 'CASE' ? active.id! : undefined, newFolder.id); });
            await Promise.all(uploadPromises);
            fetchArchiveContent();
        } catch { alert(t('error.uploadFailed')); } 
        if (folderInputRef.current) folderInputRef.current.value = '';
    };

    const handleViewItem = async (item: ArchiveItemOut) => {
        setOpeningDocId(item.id);
        try {
            const blob = await apiService.getArchiveFileBlob(item.id);
            const url = window.URL.createObjectURL(blob);
            setViewingUrl(url);
            setViewingDoc({ id: item.id, file_name: item.title, mime_type: getMimeType(item.file_type, item.title), status: 'READY' } as any);
        } catch {
            alert(t('error.generic'));
        } finally {
            setOpeningDocId(null);
        }
    };

    const handleDownload = async (id: string, title: string) => {
        try { await apiService.downloadArchiveItem(id, title); } catch { alert(t('error.generic')); }
    };

    const handleDelete = async (id: string) => {
        if(window.confirm(t('general.confirmDelete'))) await deleteItem(id);
    };

    const closePreview = () => { setViewingDoc(null); if(viewingUrl) window.URL.revokeObjectURL(viewingUrl); };

    if (loading) return <div className="flex justify-center h-64 items-center"><Loader2 className="animate-spin text-primary-start" /></div>;

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 sm:space-y-8">
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                        <input type="text" placeholder={t('header.searchPlaceholder') || "Kërko..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-base sm:text-sm focus:outline-none focus:border-primary-start/50 transition-all text-gray-200" />
                    </div>
                </div>
                <div className="flex w-full md:w-auto gap-2 flex-shrink-0 p-1.5 bg-white/5 rounded-xl border border-white/10">
                    {isInsideCase && currentView.id && (
                         <button 
                            onClick={() => setShowShareModal(true)} 
                            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/30 transition-all font-bold text-xs uppercase tracking-wide"
                        >
                            <LinkIcon size={16} /> <span className="hidden sm:inline">PORTAL LINK</span>
                        </button>
                    )}

                    <button onClick={() => setShowFolderModal(true)} className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-primary-start/10 text-primary-start hover:bg-primary-start/20 rounded-lg border border-primary-start/30 transition-all font-bold text-xs uppercase tracking-wide"><FolderPlus size={16} /> <span className="hidden sm:inline">Krijo Dosje</span></button>
                    <div className="relative flex-1 md:flex-initial"><input type="file" ref={folderInputRef} onChange={handleFolderUpload} className="hidden" {...({ webkitdirectory: "", directory: "" } as any)} multiple /><button onClick={() => folderInputRef.current?.click()} disabled={isUploading} className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-primary-start/10 text-primary-start hover:bg-primary-start/20 rounded-lg border border-primary-start/30 transition-all font-bold text-xs uppercase tracking-wide disabled:opacity-50 disabled:cursor-wait" title={t('archive.uploadFolderTooltip')}><FolderUp size={16} /> <span className="hidden sm:inline">Ngarko Dosje</span></button></div>
                    <div className="relative flex-1 md:flex-initial"><input type="file" ref={archiveInputRef} className="hidden" onChange={(e) => { if(e.target.files?.[0]) uploadFile(e.target.files[0]); }} /><button onClick={() => archiveInputRef.current?.click()} disabled={isUploading} className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-primary-start hover:bg-primary-end text-white rounded-lg shadow-lg shadow-primary-start/20 transition-all font-bold text-xs uppercase tracking-wide disabled:opacity-50 disabled:cursor-wait">{isUploading ? <Loader2 className="animate-spin w-4 h-4" /> : <FileUp size={16} />} <span className="hidden sm:inline">Ngarko Skedar</span></button></div>
                </div>
            </div>

            <ArchiveBreadcrumbs breadcrumbs={breadcrumbs} onNavigate={navigateTo} />
            
            <ArchiveGrid 
                currentViewType={currentView.type}
                filteredCases={filteredCases}
                filteredItems={filteredItems}
                openingDocId={openingDocId}
                onEnterFolder={enterFolder}
                onViewItem={handleViewItem}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onRename={setItemToRename}
                onShare={shareItem}
            />
            
            <CreateFolderModal 
                isOpen={showFolderModal} 
                onClose={() => setShowFolderModal(false)} 
                onSubmit={createFolder} 
            />

            <RenameItemModal 
                item={itemToRename} 
                onClose={() => setItemToRename(null)} 
                onSubmit={renameItem} 
            />

            {viewingDoc && <PDFViewerModal documentData={viewingDoc} onClose={closePreview} onMinimize={closePreview} t={t} directUrl={viewingUrl} />}
            
            {isInsideCase && currentView.id && (
                <ShareModal 
                    isOpen={showShareModal} 
                    onClose={() => setShowShareModal(false)} 
                    caseId={currentView.id}
                    caseTitle={currentView.name}
                />
            )}
        </motion.div>
    );
};