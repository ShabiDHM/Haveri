// FILE: src/components/business/ArchiveTab.tsx
// PHOENIX PROTOCOL - ARCHIVE V3.2 (LINTER FIX)
// 1. FIX: Removed unused 'prev' variable in TypewriterMessage to satisfy TypeScript.
// 2. INTEGRITY: Keeps all Chat, Markdown, and Archive functionality intact.

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FolderOpen, ChevronRight, FolderPlus, Loader2,
    Calendar, Hash, FileText, FileImage, File as FileIcon, Eye, Download, Trash2, Pencil, Save,
    FileUp, Search, Share2, Link as LinkIcon, Archive, Zap, CheckCircle, MessageSquare, Send, X, Bot
} from 'lucide-react';
import { apiService } from '../../services/api';
import { ArchiveItemOut, Document } from '../../data/types';
import { useTranslation } from 'react-i18next';
import { useArchiveData } from '../../hooks/useArchiveData';
import PDFViewerModal from '../PDFViewerModal';
import ShareModal from '../ShareModal';

interface ArchiveTabProps {
    caseId?: string;
}

// --- MARKDOWN & TYPEWRITER COMPONENTS ---

// 1. Simple Markdown Renderer (Zero Dependency)
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    // Split by newlines to handle paragraphs
    const lines = content.split('\n');
    
    return (
        <div className="space-y-1">
            {lines.map((line, i) => {
                // Empty lines become spacers
                if (!line.trim()) return <div key={i} className="h-2" />;
                
                // Check for List Items (starting with "- " or "1. ")
                const isList = /^- /.test(line) || /^\d+\. /.test(line);
                const cleanLine = line.replace(/^- /, '').replace(/^\d+\. /, '');
                
                // Parse Bold Syntax: **text**
                const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
                const renderedLine = parts.map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j} className="font-bold text-white">{part.slice(2, -2)}</strong>;
                    }
                    return <span key={j}>{part}</span>;
                });

                if (isList) {
                    return (
                        <div key={i} className="flex gap-2 ml-1">
                            <span className="text-indigo-400 mt-1.5 text-[10px]">●</span>
                            <div className="flex-1 leading-relaxed text-gray-300">{renderedLine}</div>
                        </div>
                    );
                }

                return <p key={i} className="leading-relaxed text-gray-300">{renderedLine}</p>;
            })}
        </div>
    );
};

// 2. Typewriter Wrapper
const TypewriterMessage: React.FC<{ content: string; onComplete?: () => void }> = ({ content, onComplete }) => {
    const [displayedContent, setDisplayedContent] = useState("");
    
    useEffect(() => {
        let index = 0;
        // Faster speed for better UX (10ms per char)
        const intervalId = setInterval(() => {
            // PHOENIX FIX: Removed unused 'prev' argument
            setDisplayedContent(content.slice(0, index + 1));
            index++;
            if (index >= content.length) {
                clearInterval(intervalId);
                if (onComplete) onComplete();
            }
        }, 10);
        
        return () => clearInterval(intervalId);
    }, [content, onComplete]);

    return <MarkdownRenderer content={displayedContent} />;
};


// --- CHAT MODAL COMPONENT ---
interface ChatModalProps {
    documentId: string;
    documentTitle: string;
    onClose: () => void;
}

const DocumentChatModal: React.FC<ChatModalProps> = ({ documentId, documentTitle, onClose }) => {
    // Messages state: content is the full text. isTyping determines if we show the typewriter effect.
    const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string, isNew?: boolean}[]>([
        { role: 'assistant', content: `Përshëndetje! Jam asistenti juaj për dokumentin "${documentTitle}". Çfarë dëshironi të dini?`, isNew: true }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, loading]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput("");
        
        // Mark previous messages as not new so they render statically
        setMessages(prev => prev.map(m => ({...m, isNew: false})));
        
        // Add User Message
        setMessages(prev => [...prev, { role: 'user', content: userMsg, isNew: false }]);
        setLoading(true);

        try {
            const response = await apiService.askDocumentQuestion(documentId, userMsg);
            // Add Assistant Message (marked as isNew to trigger typewriter)
            setMessages(prev => [...prev, { role: 'assistant', content: response.answer || "Nuk munda të gjej një përgjigje.", isNew: true }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Më vjen keq, ndodhi një gabim gjatë procesimit.", isNew: true }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center sm:justify-end sm:pr-10 pb-0 sm:pb-10 p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="bg-[#0f172a] border border-white/20 w-full max-w-md h-[600px] max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-4 flex items-center justify-between shadow-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                            <Bot className="text-white w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm">Asistenti i Dokumentit</h3>
                            <p className="text-[10px] text-blue-100 opacity-80 line-clamp-1">{documentTitle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10">
                        <X size={20} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0f172a] scroll-smooth" ref={scrollRef}>
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-sm ${
                                msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                    : 'bg-[#1e293b] text-gray-200 border border-white/5 rounded-bl-none'
                            }`}>
                                {msg.role === 'assistant' && msg.isNew ? (
                                    <TypewriterMessage content={msg.content} onComplete={() => {
                                        // Optional: logic to stop scrolling or finalized state
                                    }} />
                                ) : (
                                    msg.role === 'assistant' ? <MarkdownRenderer content={msg.content} /> : msg.content
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-[#1e293b] rounded-2xl p-4 border border-white/5 rounded-bl-none flex gap-2 items-center">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-[#1e293b]/50 border-t border-white/10 backdrop-blur-md">
                    <form onSubmit={handleSend} className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={`Pyetni rreth dokumentit...`}
                            className="w-full bg-[#020617] border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-gray-500 shadow-inner"
                        />
                        <button 
                            type="submit" 
                            disabled={!input.trim() || loading}
                            className="absolute right-2 top-1.5 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

const getMimeType = (fileType: string, fileName:string) => { const ext = fileName.split('.').pop()?.toLowerCase() || ''; if (fileType === 'PDF' || ext === 'pdf') return 'application/pdf'; return 'application/octet-stream'; };
const getFileIcon = (fileType: string) => { const ft = fileType ? fileType.toUpperCase() : ""; if (ft === 'PDF') return <FileText className="w-5 h-5 text-red-400" />; if (['PNG', 'JPG', 'JPEG'].includes(ft)) return <FileImage className="w-5 h-5 text-purple-400" />; return <FileIcon className="w-5 h-5 text-blue-400" />; };

const StatusBadge = ({ status }: { status?: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | null }) => { 
    const { t } = useTranslation(); 
    if (status === 'READY') return <div className="p-1.5" title={t('archive.statusReady')}><CheckCircle size={14} className="text-emerald-400"/></div>; 
    if (status === 'PROCESSING') return <div className="p-1.5" title={t('archive.statusProcessing')}><Loader2 size={14} className="animate-spin text-blue-400" /></div>; 
    return <div className="p-1.5" title={t('archive.statusUnknown')}><Zap size={14} className="text-gray-400"/></div>; 
};

const ActionButton = ({ icon, label, onClick, primary = false, disabled = false }: { icon: React.ReactNode, label: string, onClick: () => void, primary?: boolean, disabled?: boolean }) => ( <button onClick={onClick} disabled={disabled} className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold ${disabled ? 'opacity-50' : ''} ${primary ? 'bg-indigo-600 text-white' : 'bg-gray-800/50 text-gray-300 border border-white/10'}`}> {icon} <span>{label}</span> </button> );

const ArchiveCard = ({ title, subtitle, type, date, icon, onClick, onDownload, onDelete, onRename, onShare, onReIndex, onAskAI, isShared, isFolder, isLoading, indexingStatus }: any) => { 
    return ( 
        <motion.div whileHover={{ scale: 1.02 }} onClick={onClick} className="group relative flex flex-col justify-between h-full min-h-[14rem] p-6 rounded-3xl bg-gray-900/60 border border-white/10"> 
            <div> 
                <div className="flex justify-between items-start gap-2 mb-4"> 
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10">{icon}</div> 
                    <div className="flex items-center gap-2">
                        {/* Status Badge */}
                        {!isFolder && <StatusBadge status={indexingStatus} />}
                        
                        {/* Share Indicator */}
                        {isShared && (<div className="p-1.5 text-emerald-400"><Share2 size={14} /></div>)}

                        {/* Ask AI Trigger (Visible if ready) */}
                        {!isFolder && indexingStatus === 'READY' && onAskAI && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onAskAI(); }} 
                                className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                title="Ask AI"
                            >
                                <MessageSquare size={14} />
                            </button>
                        )}
                    </div> 
                </div> 
                <div><h2 className="text-lg font-bold text-gray-100 line-clamp-2">{title}</h2><div className="flex items-center gap-2 mt-2"><Calendar className="w-3.5 h-3.5 text-gray-500"/><p className="text-xs text-gray-500">{date}</p></div></div> 
                <div className="mt-4 space-y-1.5 pl-3 border-l-2 border-white/5"><div className="flex items-center gap-2 text-sm text-gray-300">{isFolder ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <FileText className="w-4 h-4 text-blue-500" />}<span>{type}</span></div><div className="flex items-center gap-2 text-xs text-gray-500"><Hash className="w-3.5 h-3.5"/><span>{subtitle}</span></div></div> 
            </div> 
            <div className="pt-4 border-t border-white/5 flex justify-end items-center"> 
                <div className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isFolder && onReIndex && (<button onClick={(e) => { e.stopPropagation(); onReIndex(); }} className="p-2 text-gray-400 hover:text-amber-400"><Zap size={16} /></button>)}
                    {!isFolder && onShare && (<button onClick={(e) => { e.stopPropagation(); onShare(); }} className={`p-2 ${isShared ? 'text-emerald-400' : 'text-gray-400 hover:text-white'}`}><Share2 size={16} /></button>)}
                    {onRename && (<button onClick={(e) => { e.stopPropagation(); onRename(); }} className="p-2 text-gray-400 hover:text-white"><Pencil size={16} /></button>)}
                    
                    {/* Ask AI Button in Actions Row */}
                    {!isFolder && indexingStatus === 'READY' && onAskAI && (
                         <button onClick={(e) => { e.stopPropagation(); onAskAI(); }} className="p-2 text-gray-400 hover:text-indigo-400" title="Ask AI"><MessageSquare size={16} /></button>
                    )}

                    {!isFolder && (<><button onClick={(e) => { e.stopPropagation(); onClick(); }} className="p-2 text-gray-400 hover:text-blue-400">{isLoading ? <Loader2 className="animate-spin" size={16} /> : <Eye size={16} />}</button>{onDownload && (<button onClick={(e) => { e.stopPropagation(); onDownload(); }} className="p-2 text-gray-400 hover:text-emerald-400"><Download size={16} /></button>)}</>)}
                    {onDelete && (<button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-gray-400 hover:text-red-400"><Trash2 size={16} /></button>)}
                </div> 
            </div> 
        </motion.div> 
    ); 
};

export const ArchiveTab: React.FC<ArchiveTabProps> = ({ caseId }) => {
    const { t } = useTranslation();
    const { loading, archiveItems, breadcrumbs, currentView, filteredItems, isUploading, searchTerm, setSearchTerm, navigateTo, enterFolder, createFolder, uploadFile, deleteItem, renameItem, fetchArchiveContent, isInsideCase } = useArchiveData(caseId);

    const [showFolderModal, setShowFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
    const [viewingUrl, setViewingUrl] = useState<string | null>(null);
    const [openingDocId, setOpeningDocId] = useState<string | null>(null);
    const [itemToRename, setItemToRename] = useState<ArchiveItemOut | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [showShareModal, setShowShareModal] = useState(false);
    
    // PHOENIX: State for Ask AI
    const [chatDoc, setChatDoc] = useState<{id: string, title: string} | null>(null);
    
    const archiveInputRef = useRef<HTMLInputElement>(null);

    const translateSystemName = (name: string) => { if (!name) return ""; const lowerName = name.toLowerCase().trim(); if (lowerName === "my workspace") return t('archive.myWorkspace'); return name; };

    const handleCreateFolder = async (e: React.FormEvent) => { e.preventDefault(); if (!newFolderName.trim()) return; await createFolder(newFolderName, "GENERAL"); setShowFolderModal(false); setNewFolderName(""); };
    const handleSmartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; await uploadFile(f); if (archiveInputRef.current) archiveInputRef.current.value = ""; };
    const handleReIndex = async (itemId: string) => { try { await apiService.reIndexArchiveItem(itemId); fetchArchiveContent(); } catch (error) { alert(t('error.generic')); } };
    const handleViewItem = async (item: ArchiveItemOut) => { setOpeningDocId(item.id); try { const blob = await apiService.getArchiveFileBlob(item.id); const url = window.URL.createObjectURL(blob); setViewingUrl(url); setViewingDoc({ id: item.id, file_name: item.title, mime_type: getMimeType(item.file_type, item.title), status: 'READY' } as any); } catch { alert(t('error.generic')); } finally { setOpeningDocId(null); } };
    const closePreview = () => { setViewingDoc(null); if(viewingUrl) window.URL.revokeObjectURL(viewingUrl); };
    const handleRenameClick = (item: ArchiveItemOut) => { setItemToRename(item); setRenameValue(item.title); };
    const submitRename = async (e: React.FormEvent) => { e.preventDefault(); if (!itemToRename || !renameValue.trim()) return; await renameItem(itemToRename.id, renameValue); setItemToRename(null); };

    const shareItem = async (item: ArchiveItemOut) => {
        const newStatus = !item.is_shared;
        try { await apiService.shareArchiveItem(item.id, newStatus, caseId); fetchArchiveContent(); } 
        catch(e) { alert('Failed to update share status'); }
    };

    const showPortalButton = isInsideCase || !!caseId;
    const portalTargetId = isInsideCase ? currentView.id : caseId;

    if (loading && archiveItems.length === 0) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>;

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 h-full flex flex-col">
            <div className="bg-gray-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md flex-shrink-0">
                 <div className="flex flex-col xl:flex-row gap-6">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                        <input type="text" placeholder={t('header.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-white" />
                    </div>
                    <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                        {showPortalButton && portalTargetId && ( <ActionButton icon={<LinkIcon size={20} />} label="PORTAL" onClick={() => setShowShareModal(true)} /> )}
                        <ActionButton icon={<FolderPlus size={20} />} label="Krijo Dosje" onClick={() => setShowFolderModal(true)} />
                        <input type="file" ref={archiveInputRef} className="hidden" onChange={handleSmartUpload} />
                        <ActionButton primary icon={isUploading ? <Loader2 className="animate-spin" size={20} /> : <FileUp size={20} />} label="Ngarko" onClick={() => archiveInputRef.current?.click()} disabled={isUploading} />
                    </div>
                 </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto text-sm no-scrollbar pb-2 flex-shrink-0">
                {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.id || 'root'}>
                        <button onClick={() => navigateTo(index)} className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border ${index === breadcrumbs.length - 1 ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'text-gray-500 border-transparent hover:bg-white/5'}`}>
                            <Archive size={16} />{translateSystemName(crumb.name)}
                        </button>
                        {index < breadcrumbs.length - 1 && <ChevronRight size={16} className="text-gray-700" />}
                    </React.Fragment>
                ))}
            </div>
            
            <div className="bg-gray-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex-1 overflow-y-auto">
                {filteredItems.length > 0 ? (
                    <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        <AnimatePresence>
                            {filteredItems.map(item => (
                                <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={item.id}>
                                    <ArchiveCard 
                                        title={translateSystemName(item.title)} 
                                        subtitle={item.item_type === 'FOLDER' ? t('archive.caseFolders') : `${item.file_type} Dokument`} 
                                        type={item.item_type === 'FOLDER' ? 'Folder' : item.file_type} 
                                        date={new Date(item.created_at).toLocaleDateString()} 
                                        icon={item.item_type === 'FOLDER' ? <FolderOpen className="w-6 h-6 text-amber-500" /> : getFileIcon(item.file_type)} 
                                        isFolder={item.item_type === 'FOLDER'} 
                                        isShared={item.is_shared} 
                                        isLoading={openingDocId === item.id} 
                                        indexingStatus={item.indexing_status} 
                                        onClick={() => item.item_type === 'FOLDER' ? enterFolder(item.id, item.title, 'FOLDER') : handleViewItem(item)} 
                                        onDownload={() => apiService.downloadArchiveItem(item.id, item.title)} 
                                        onDelete={() => deleteItem(item.id)} 
                                        onRename={() => handleRenameClick(item)} 
                                        onShare={() => shareItem(item)} 
                                        onReIndex={() => handleReIndex(item.id)}
                                        onAskAI={() => setChatDoc({id: item.id, title: item.title})} // Pass the Ask AI handler
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                ) : (<div className="flex flex-col items-center justify-center h-full text-gray-500"><FolderOpen size={64} className="mb-4 opacity-20" /><p>{t('archive.emptyFolder')}</p></div>)}
            </div>
            
            {showFolderModal && ( <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"><div className="bg-[#0f172a] border rounded-3xl w-full max-w-sm p-6"><h3 className="text-xl font-bold text-white mb-6">Krijo Dosje</h3><form onSubmit={handleCreateFolder}><div className="relative mb-8"><FolderOpen className="absolute left-4 top-3.5 w-6 h-6 text-amber-500" /><input autoFocus type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Emri..." className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 py-3.5 text-white" /></div><div className="flex justify-end gap-3"><button type="button" onClick={() => setShowFolderModal(false)} className="px-6 py-3 rounded-xl bg-white/5">Anulo</button><button type="submit" className="px-8 py-3 bg-amber-600 text-white rounded-xl">Krijo</button></div></form></div></div> )}
            {itemToRename && ( <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"><div className="bg-[#0f172a] border rounded-3xl w-full max-w-sm p-6"><h3 className="text-xl font-bold text-white mb-6">Riemërto</h3><form onSubmit={submitRename}><div className="relative mb-5"><Pencil className="absolute left-4 top-3.5 w-5 h-5 text-blue-400" /><input autoFocus type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="w-full bg-black/40 border rounded-xl pl-12 py-3.5 text-white" /></div><div className="flex justify-end gap-3"><button type="button" onClick={() => setItemToRename(null)} className="px-6 py-3 rounded-xl bg-white/5">Anulo</button><button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-xl flex items-center gap-2"><Save size={16} /> Ruaj</button></div></form></div></div> )}
            {viewingDoc && <PDFViewerModal documentData={viewingDoc} onClose={closePreview} t={t} directUrl={viewingUrl} />}
            {portalTargetId && ( <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} caseId={portalTargetId} caseTitle={currentView.name} /> )}
            
            {/* ASK AI MODAL */}
            <AnimatePresence>
                {chatDoc && (
                    <DocumentChatModal 
                        documentId={chatDoc.id} 
                        documentTitle={chatDoc.title} 
                        onClose={() => setChatDoc(null)} 
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};