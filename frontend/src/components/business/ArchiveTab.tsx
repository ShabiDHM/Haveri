// FILE: src/components/business/ArchiveTab.tsx
// PHOENIX PROTOCOL - ARCHIVE TAB V8.1 (EXECUTIVE DESIGN SYSTEM)
// UPDATED: Converted to semantic Tailwind classes (glass-panel, border-border-main, text-text-*, etc.)
// ADDED: hover-lift, shadow-sm, consistent backdrop blur.
// RETAINED: All logic and functionality.

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FolderOpen, ChevronRight, FolderPlus, Loader2,
    Calendar, Eye, Download, Trash2, Pencil,
    FileUp, Search, Share2, Link as LinkIcon, Archive, Zap, CheckCircle, MessageSquare, Send, X, Bot
} from 'lucide-react';
import { apiService } from '../../services/api';
import { ArchiveItemOut, Document } from '../../data/types';
import { useTranslation } from 'react-i18next';
import { useArchiveData } from '../../hooks/useArchiveData';
import PDFViewerModal from '../PDFViewerModal';
import ShareModal from '../ShareModal';
import { ForensicAccountantModal } from './insights/ForensicAccountantModal';
import { getFileIcon } from './archive/ArchiveCard';
import { Panel } from '../ui/Panel';

interface ArchiveTabProps {
    workspaceId?: string;
}

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const paragraphs = content.split(/\n\n+/);
    return (
        <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
            {paragraphs.map((paragraph, pIdx) => (
                <div key={pIdx} className="mb-2">
                    {paragraph.split('\n').map((line, lIdx) => {
                        const isListItem = /^[•-]\s|^\d+\.\s/.test(line);
                        const cleanLine = line.replace(/^[•-]\s|^\d+\.\s/, '');
                        if (isListItem) {
                            return (
                                <div key={lIdx} className="flex gap-2 ml-2 mb-1">
                                    <span className="text-primary-start mt-1.5 text-[8px]">●</span>
                                    <div className="flex-1">{cleanLine}</div>
                                </div>
                            );
                        }
                        return <p key={lIdx}>{line}</p>;
                    })}
                </div>
            ))}
        </div>
    );
};

const DocumentChatModal: React.FC<{ documentId: string; documentTitle: string; onClose: () => void }> = ({ documentId, documentTitle, onClose }) => {
    const { t } = useTranslation();
    const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
        { role: 'assistant', content: t('ai.doc_assistant_intro', { title: documentTitle }) }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;
        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);
        try {
            const response = await apiService.askDocumentQuestion(documentId, userMsg);
            setMessages(prev => [...prev, { role: 'assistant', content: response.answer }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: t('error.generic') }]);
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-[110] flex justify-end pointer-events-none">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-md h-full glass-panel border-l border-border-main shadow-sm flex flex-col pointer-events-auto">
                <div className="bg-primary-start p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-inverse font-bold">
                        <Bot size={22} />
                        <span className="truncate max-w-[200px]">{documentTitle}</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-inverse/10 rounded-full text-inverse/80 hover:text-inverse transition-colors"><X size={24}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" ref={scrollRef}>
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-primary-start text-white rounded-tr-none' : 'bg-surface/30 backdrop-blur-sm border border-border-main text-text-secondary rounded-tl-none'}`}>
                                <MarkdownRenderer content={msg.content} />
                            </div>
                        </div>
                    ))}
                    {loading && <div className="flex justify-start p-4"><Loader2 className="animate-spin text-primary-start" /></div>}
                </div>
                <form onSubmit={handleSend} className="p-6 bg-surface/30 backdrop-blur-sm border-t border-border-main flex gap-2">
                    <input autoFocus type="text" value={input} onChange={(e) => setInput(e.target.value)} className="glass-input flex-1 text-sm border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all" placeholder={t('ai.ask_placeholder')} />
                    <button type="submit" disabled={loading} className="p-3 bg-primary-start text-white rounded-xl hover-lift shadow-sm"><Send size={20}/></button>
                </form>
            </motion.div>
        </div>
    );
};

const ArchiveCard = ({ title, subtitle, type, date, onClick, onDownload, onDelete, onRename, onShare, onReIndex, onAskAI, isShared, isFolder, isLoading, indexingStatus }: any) => { 
    const { t } = useTranslation();
    return ( 
        <motion.div whileHover={{ scale: 1.01 }} onClick={onClick} className="group relative flex flex-col justify-between h-full min-h-[14rem] p-6 rounded-2xl glass-panel border border-border-main hover:border-primary-start/30 transition-all cursor-pointer hover-lift shadow-sm"> 
            <div> 
                <div className="flex justify-between items-start gap-2 mb-4"> 
                    <div className="p-3 rounded-2xl bg-surface/30 backdrop-blur-sm border border-border-main">{isFolder ? <FolderOpen className="w-6 h-6 text-warning-start" /> : getFileIcon(type)}</div> 
                    <div className="flex items-center gap-2">
                        {indexingStatus === 'READY' && <CheckCircle size={14} className="text-success-start" />}
                        {indexingStatus === 'PROCESSING' && <Loader2 size={14} className="animate-spin text-primary-start" />}
                        {isShared && <Share2 size={14} className="text-success-start" />}
                    </div> 
                </div> 
                <h2 className="text-lg font-bold text-text-primary line-clamp-2 leading-tight">{title}</h2>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{subtitle}</span>
                </div>
            </div> 
            <div className="pt-4 border-t border-border-main flex justify-between items-center mt-4"> 
                <div className="flex items-center gap-1.5 text-text-muted">
                    <Calendar size={12}/> 
                    <span className="text-[10px] font-black uppercase tracking-widest">{date}</span>
                </div>
                <div className="flex gap-1 items-center">
                    {!isFolder && onReIndex && <button onClick={(e) => { e.stopPropagation(); onReIndex(); }} className="p-2 text-text-muted hover:text-warning-start transition-colors hover-lift" title={t('archive.reindex')}><Zap size={16} /></button>}
                    {!isFolder && indexingStatus === 'READY' && onAskAI && <button onClick={(e) => { e.stopPropagation(); onAskAI(); }} className="p-2 text-text-muted hover:text-primary-start transition-colors hover-lift" title={t('archive.ask_ai')}><MessageSquare size={16} /></button>}
                    {onShare && <button onClick={(e) => { e.stopPropagation(); onShare(); }} className={`p-2 ${isShared ? 'text-success-start' : 'text-text-muted hover:text-text-primary'} hover-lift`}><Share2 size={16} /></button>}
                    {onRename && <button onClick={(e) => { e.stopPropagation(); onRename(); }} className="p-2 text-text-muted hover:text-text-primary transition-colors hover-lift" title={t('general.edit')}><Pencil size={16}/></button>}
                    {!isFolder && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="p-2 text-text-muted hover:text-primary-start transition-colors hover-lift">{isLoading ? <Loader2 className="animate-spin" size={16} /> : <Eye size={16} />}</button>
                            <button onClick={(e) => { e.stopPropagation(); onDownload(); }} className="p-2 text-text-muted hover:text-success-start transition-colors hover-lift"><Download size={16} /></button>
                        </>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-text-muted hover:text-danger-start transition-colors hover-lift"><Trash2 size={16} /></button>
                </div> 
            </div> 
        </motion.div> 
    ); 
};

export const ArchiveTab: React.FC<ArchiveTabProps> = ({ workspaceId }) => {
    const { t } = useTranslation();
    const { 
        loading, breadcrumbs, filteredItems, isUploading, 
        searchTerm, setSearchTerm, navigateTo, enterFolder, 
        createFolder, uploadFile, deleteItem, 
        fetchArchiveContent, isInsideWorkspace, currentView 
    } = useArchiveData(workspaceId);

    const [newFolderName, setNewFolderName] = useState("");
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
    const [viewingUrl, setViewingUrl] = useState<string | null>(null);
    const [openingDocId, setOpeningDocId] = useState<string | null>(null);
    const [itemToRename, setItemToRename] = useState<ArchiveItemOut | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showForensicModal, setShowForensicModal] = useState(false);
    const [chatDoc, setChatDoc] = useState<{id: string, title: string} | null>(null);

    const archiveInputRef = useRef<HTMLInputElement>(null);

    const handleCreateFolder = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (!newFolderName.trim()) return; 
        await createFolder(newFolderName, "GENERAL"); 
        setShowFolderModal(false); 
        setNewFolderName(""); 
    };

    const handleRenameItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!renameValue.trim() || !itemToRename) return;
        try {
            await apiService.renameArchiveItem(itemToRename.id, renameValue);
            fetchArchiveContent();
            setShowRenameModal(false);
            setItemToRename(null);
            setRenameValue("");
        } catch (err) {
            alert(t('error.generic'));
        }
    };

    const shareItem = async (item: ArchiveItemOut) => {
        const newStatus = !item.is_shared;
        try { 
            await apiService.shareArchiveItem(item.id, newStatus, workspaceId); 
            fetchArchiveContent(); 
        } catch(e) { 
            alert(t('error.generic')); 
        }
    };

    const handleViewItem = async (item: ArchiveItemOut) => {
        const isDataFile = ['CSV', 'XLSX', 'XLS'].includes(item.file_type.toUpperCase());
        setOpeningDocId(item.id); 
        try { 
            const blob = await apiService.getArchiveFileBlob(item.id); 
            const url = window.URL.createObjectURL(blob); 
            setViewingUrl(url); 
            setViewingDoc({ 
                id: item.id, 
                file_name: item.title, 
                mime_type: isDataFile ? 'text/csv' : (item.file_type.toUpperCase() === 'PDF' ? 'application/pdf' : 'image/jpeg'), 
                status: 'READY' 
            } as any); 
        } catch { 
            alert(t('error.generic')); 
        } finally { 
            setOpeningDocId(null); 
        } 
    };

    if (loading && filteredItems.length === 0) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-primary-start" /></div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-6 md:p-8 space-y-6 h-full flex flex-col border border-border-main bg-canvas shadow-sm">
            {/* Search and Actions Panel */}
            <Panel className="p-4 sm:p-6 flex-shrink-0 border border-border-main bg-surface/30 backdrop-blur-sm shadow-sm">
                <div className="flex flex-col xl:flex-row gap-4">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted group-focus-within:text-primary-start transition-colors" />
                        <input 
                            type="text" 
                            placeholder={t('header.searchPlaceholder')} 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="glass-input w-full pl-12 border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all" 
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                        {(isInsideWorkspace || !!workspaceId) && (
                            <button onClick={() => setShowShareModal(true)} className="glass-input !bg-surface hover:bg-hover transition-colors px-3 py-3 text-xs sm:text-sm flex items-center justify-center gap-2 hover-lift shadow-sm border border-border-main">
                                <LinkIcon size={16} className="shrink-0" /><span>{t('archive.portal_access')}</span>
                            </button>
                        )}
                        <button onClick={() => setShowFolderModal(true)} className="glass-input !bg-surface hover:bg-hover transition-colors px-3 py-3 text-xs sm:text-sm flex items-center justify-center gap-2 hover-lift shadow-sm border border-border-main">
                            <FolderPlus size={16} className="shrink-0" /> <span>{t('archive.createFolder')}</span>
                        </button>
                        <input type="file" ref={archiveInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                        <button onClick={() => archiveInputRef.current?.click()} disabled={isUploading} className="btn-primary col-span-2 sm:col-auto px-6 py-3 text-sm flex items-center justify-center gap-2 rounded-xl hover-lift shadow-sm">
                            {isUploading ? <Loader2 className="animate-spin" size={18}/> : <FileUp size={18}/>} {t('archive.upload')}
                        </button>
                    </div>
                </div>
            </Panel>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 overflow-x-auto text-xs sm:text-sm no-scrollbar pb-2 flex-shrink-0">
                {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.id || index}>
                        <button onClick={() => navigateTo(index)} className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border ${index === breadcrumbs.length - 1 ? 'bg-primary-start/20 text-primary-start border border-primary-start/30' : 'text-text-muted border border-border-main hover:bg-hover'} hover-lift shadow-sm`}>
                            <Archive size={14} />{crumb.name === "My Workspace" ? t('archive.myWorkspace') : crumb.name}
                        </button>
                        {index < breadcrumbs.length - 1 && <ChevronRight size={14} className="text-border-main" />}
                    </React.Fragment>
                ))}
            </div>
            
            {/* Archive Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                <AnimatePresence>
                    {filteredItems.map(item => (
                        <ArchiveCard 
                            key={item.id}
                            title={item.title} 
                            subtitle={item.item_type === 'FOLDER' ? t('archive.caseFolders') : `${item.file_type} ${t('general.document')}`} 
                            type={item.item_type === 'FOLDER' ? 'Folder' : item.file_type} 
                            date={new Date(item.created_at).toLocaleDateString()} 
                            indexingStatus={item.indexing_status}
                            isFolder={item.item_type === 'FOLDER'} 
                            isShared={item.is_shared} 
                            isLoading={openingDocId === item.id} 
                            onClick={() => item.item_type === 'FOLDER' ? enterFolder(item.id, item.title, 'FOLDER') : handleViewItem(item)} 
                            onDownload={() => apiService.downloadArchiveItem(item.id, item.title)} 
                            onDelete={() => deleteItem(item.id)} 
                            onRename={() => { setItemToRename(item); setRenameValue(item.title); setShowRenameModal(true); }} 
                            onShare={() => shareItem(item)} 
                            onAskAI={() => setChatDoc({id: item.id, title: item.title})}
                        />
                    ))}
                </AnimatePresence>
            </div>
            
            <ForensicAccountantModal isOpen={showForensicModal} onClose={() => setShowForensicModal(false)} />
            <AnimatePresence>{chatDoc && <DocumentChatModal documentId={chatDoc.id} documentTitle={chatDoc.title} onClose={() => setChatDoc(null)} />}</AnimatePresence>
            
            {/* Create Folder Modal */}
            <AnimatePresence>
                {showFolderModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                        <motion.div onClick={() => setShowFolderModal(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto" />
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative glass-panel pointer-events-auto max-w-md w-full mx-4 space-y-4 shadow-sm border border-border-main">
                            <div className="flex justify-between items-center p-6 pb-0">
                                <h3 className="text-xl font-bold text-text-primary">{t('archive.createFolder')}</h3>
                                <button onClick={() => setShowFolderModal(false)} className="p-2 hover:bg-hover rounded-full text-text-muted"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleCreateFolder} className="p-6 pt-4 space-y-4">
                                <input 
                                    autoFocus
                                    type="text" 
                                    value={newFolderName} 
                                    onChange={(e) => setNewFolderName(e.target.value)} 
                                    placeholder={t('archive.folderNamePlaceholder')} 
                                    className="glass-input w-full border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all" 
                                />
                                <div className="flex gap-3 justify-end">
                                    <button type="button" onClick={() => setShowFolderModal(false)} className="glass-input !bg-surface hover:bg-hover transition-colors px-4 py-2 rounded-xl hover-lift shadow-sm border border-border-main">{t('general.cancel')}</button>
                                    <button type="submit" className="btn-primary px-6 py-2 rounded-xl hover-lift shadow-sm">{t('general.create')}</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Rename Modal */}
            <AnimatePresence>
                {showRenameModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                        <motion.div onClick={() => setShowRenameModal(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto" />
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative glass-panel pointer-events-auto max-w-md w-full mx-4 space-y-4 shadow-sm border border-border-main">
                            <div className="flex justify-between items-center p-6 pb-0">
                                <h3 className="text-xl font-bold text-text-primary">{t('general.edit')}</h3>
                                <button onClick={() => setShowRenameModal(false)} className="p-2 hover:bg-hover rounded-full text-text-muted"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleRenameItem} className="p-6 pt-4 space-y-4">
                                <input 
                                    autoFocus
                                    type="text" 
                                    value={renameValue} 
                                    onChange={(e) => setRenameValue(e.target.value)} 
                                    placeholder={t('general.name')} 
                                    className="glass-input w-full border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all" 
                                />
                                <div className="flex gap-3 justify-end">
                                    <button type="button" onClick={() => setShowRenameModal(false)} className="glass-input !bg-surface hover:bg-hover transition-colors px-4 py-2 rounded-xl hover-lift shadow-sm border border-border-main">{t('general.cancel')}</button>
                                    <button type="submit" className="btn-primary px-6 py-2 rounded-xl hover-lift shadow-sm">{t('general.save')}</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {viewingDoc && <PDFViewerModal documentData={viewingDoc} onClose={() => setViewingDoc(null)} t={t} directUrl={viewingUrl || ""} />}
            {showShareModal && <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} caseId={(isInsideWorkspace ? currentView.id : workspaceId) || ""} caseTitle={currentView.name} />}
        </motion.div>
    );
};