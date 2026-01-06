// FILE: src/components/business/ArchiveTab.tsx
// PHOENIX PROTOCOL - CUMULATIVE FIXES
// ---
// FIX V24.0: SSE DATA-CONTRACT RESILIENCE
// 1. ROOT CAUSE: The SSE event handler was too strict, expecting only a `document_id` and `status` field. This caused silent failures if the backend sent `id`/`_id` or `indexing_status`.
// 2. FIX: The event handler now robustly checks for `document_id`, `id`, or `_id` for the document identifier, and `status` or `indexing_status` for the new status.
// 3. LOGIC: This change makes the client resilient to minor variations in the backend's SSE data contract, preventing silent update failures.
// ---
// FIX V23.0: AUTH-AWARE SSE
// 1. ROOT CAUSE: A race condition where the SSE connection was attempted before the user's auth token was available.
// 2. FIX: Integrated the 'useAuth' hook. The SSE 'useEffect' is now dependent on the 'isAuthenticated' flag.
// 3. LOGIC: The connection is now only established AFTER authentication is confirmed, guaranteeing a valid token is available.

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Briefcase, FolderOpen, ChevronRight, FolderPlus, Loader2,
    Calendar, Hash, FileText, FileImage, FileCode, File as FileIcon, Eye, Download, Trash2, Tag, X, Pencil, Save,
    FolderUp, FileUp, Search, Share2, Link as LinkIcon, Archive, Zap, CheckCircle, AlertCircle
} from 'lucide-react';
import { apiService, API_V1_URL } from '../../services/api';
import { ArchiveItemOut, Case, Document } from '../../data/types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import PDFViewerModal from '../PDFViewerModal';
import ShareModal from '../ShareModal';

type Breadcrumb = { id: string | null; name: string; type: 'ROOT' | 'CASE' | 'FOLDER'; };

// --- COMPONENTS (No changes) ---
const getMimeType = (fileType: string, fileName: string) => { const ext = fileName.split('.').pop()?.toLowerCase() || ''; if (fileType === 'PDF' || ext === 'pdf') return 'application/pdf'; if (['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF'].includes(fileType)) return 'image/jpeg'; return 'application/octet-stream'; };
const getFileIcon = (fileType: string) => { const ft = fileType ? fileType.toUpperCase() : ""; if (ft === 'PDF') return <FileText className="w-5 h-5 text-red-400" />; if (['PNG', 'JPG', 'JPEG'].includes(ft)) return <FileImage className="w-5 h-5 text-purple-400" />; if (['JSON', 'JS', 'TS'].includes(ft)) return <FileCode className="w-5 h-5 text-yellow-400" />; return <FileIcon className="w-5 h-5 text-blue-400" />; };
const StatusBadge = ({ status }: { status?: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' }) => { const { t } = useTranslation(); if (status === 'READY') return <div className="bg-emerald-500/10 text-emerald-400 p-1.5 rounded-lg border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]" title={t('archive.statusReady', 'Gati për AI')}><CheckCircle size={14} /></div>; if (status === 'PROCESSING') return <div className="bg-blue-500/10 text-blue-400 p-1.5 rounded-lg border border-blue-500/20" title={t('archive.statusProcessing', 'Duke procesuar...')}><Loader2 size={14} className="animate-spin" /></div>; if (status === 'PENDING') return <div className="bg-amber-500/10 text-amber-400 p-1.5 rounded-lg border border-amber-500/20" title={t('archive.statusPending', 'Në pritje')}><Zap size={14} /></div>; if (status === 'FAILED') return <div className="bg-rose-500/10 text-rose-400 p-1.5 rounded-lg border border-rose-500/20" title={t('archive.statusFailed', 'Dështoi')}><AlertCircle size={14} /></div>; return null; };
const ActionButton = ({ icon, label, onClick, primary = false, disabled = false, fullWidth = false }: { icon: React.ReactNode, label: string, onClick: () => void, primary?: boolean, disabled?: boolean, fullWidth?: boolean }) => ( <button onClick={onClick} disabled={disabled} className={` flex items-center justify-center text-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all duration-300 group ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${primary ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/50' : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 border border-white/10 hover:border-white/20'} `}> <span className={`transition-transform duration-300 group-hover:scale-110 ${primary ? 'text-white' : 'text-indigo-400'}`}>{icon}</span> <span>{label}</span> </button> );
const ArchiveCard = ({ title, subtitle, type, date, icon, onClick, onDownload, onDelete, onRename, onShare, isShared, isFolder, isLoading, indexingStatus }: any) => { const { t } = useTranslation(); return ( <motion.div whileHover={{ scale: 1.02 }} onClick={onClick} className={`group relative flex flex-col justify-between h-full min-h-[14rem] p-6 rounded-3xl transition-all duration-300 cursor-pointer bg-gray-900/60 backdrop-blur-md border border-white/10 shadow-xl hover:shadow-2xl hover:border-indigo-500/30`}> <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" /> <div> <div className="flex flex-col mb-4 relative z-10"> <div className="flex justify-between items-start gap-2"> <div className="p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all duration-300">{icon}</div> <div className="flex items-center gap-2">{!isFolder && <StatusBadge status={indexingStatus} />}{isShared && (<div className="bg-emerald-500/10 text-emerald-400 p-1.5 rounded-lg border border-emerald-500/20 cursor-default shadow-[0_0_10px_rgba(16,185,129,0.2)]" title={t('archive.isShared')}><Share2 size={14} /></div>)}</div> </div> <div className="mt-4"><h2 className="text-lg font-bold text-gray-100 line-clamp-2 leading-tight tracking-tight group-hover:text-indigo-400 transition-colors break-words"> {title} </h2><div className="flex items-center gap-2 mt-2"><Calendar className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" /><p className="text-xs text-gray-500 font-medium truncate">{date}</p></div></div> </div> <div className="flex flex-col mb-4 relative z-10"> <div className="space-y-1.5 pl-1 border-l-2 border-white/5 group-hover:border-indigo-500/30 transition-colors pl-3"> <div className="flex items-center gap-2 text-sm font-medium text-gray-300">{isFolder ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <FileText className="w-4 h-4 text-blue-500" />}<span className="truncate">{type}</span></div> <div className="flex items-center gap-2 text-xs text-gray-500"><Hash className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{subtitle}</span></div> </div> </div> </div> <div className="relative z-10 pt-4 border-t border-white/5 flex items-center justify-between"> <span className="text-xs font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors flex items-center gap-1 uppercase tracking-wider"> {isFolder ? t('archive.openFolder') : ''} </span> <div className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">{!isFolder && onShare && ( <button onClick={(e) => { e.stopPropagation(); onShare(); }} className={`p-2 rounded-lg transition-colors ${isShared ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-white/10'}`} title={t('archive.share')}> <Share2 className="h-4 w-4" /> </button> )}{onRename && ( <button onClick={(e) => { e.stopPropagation(); onRename(); }} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors" title={t('general.edit')}> <Pencil className="h-4 w-4" /> </button> )}{!isFolder && ( <> <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="p-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 transition-colors" title={t('general.view')}> {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-blue-400" /> : <Eye className="h-4 w-4" />} </button> {onDownload && ( <button onClick={(e) => { e.stopPropagation(); onDownload(); }} className="p-2 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors" title={t('general.download')}> <Download className="h-4 w-4" /> </button> )} </> )}{onDelete && ( <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors" title={t('general.delete')}> <Trash2 className="h-4 w-4" /> </button> )}</div> </div> </motion.div> ); };

export const ArchiveTab: React.FC = () => {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(true);
    const [archiveItems, setArchiveItems] = useState<ArchiveItemOut[]>([]);
    const [cases, setCases] = useState<Case[]>([]);
    const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: t('business.archive'), type: 'ROOT' }]);
    const [isUploading, setIsUploading] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [newFolderCategory, setNewFolderCategory] = useState("GENERAL");
    const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
    const [viewingUrl, setViewingUrl] = useState<string | null>(null);
    const [openingDocId, setOpeningDocId] = useState<string | null>(null);
    const [itemToRename, setItemToRename] = useState<ArchiveItemOut | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [showShareModal, setShowShareModal] = useState(false);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const archiveInputRef = useRef<HTMLInputElement>(null);

    const translateSystemName = (name: string) => { if (!name) return ""; const lowerName = name.toLowerCase().trim(); if (lowerName === "my workspace") return t('archive.myWorkspace', 'Hapësira e Punës'); if (lowerName === "general") return t('category.general', 'Të Përgjithshme'); return name; };

    useEffect(() => { loadCases(); }, []);
    useEffect(() => { fetchArchiveContent(); }, [breadcrumbs]);

    useEffect(() => {
        if (!isAuthenticated) return;

        const token = apiService.getToken();
        if (!token) return;

        const sseUrl = `${API_V1_URL}/stream/updates?token=${token}`;
        const eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // PHOENIX FIX V24.0: Accept 'document_id', 'id', or '_id' from the event stream for robustness.
                const updatedDocId = data.document_id || data.id || data._id;
                const newStatus = data.status || data.indexing_status;

                if (data.type === 'DOCUMENT_STATUS' && updatedDocId && newStatus) {
                    setArchiveItems(prevItems => 
                        prevItems.map(item => 
                            item.id === updatedDocId 
                                ? { ...item, indexing_status: newStatus }
                                : item
                        )
                    );
                }
            } catch (error) { console.error("Failed to parse SSE message:", error); }
        };
        eventSource.onerror = (error) => { console.error('EventSource connection failed:', error); eventSource.close(); };
        return () => { eventSource.close(); };
    }, [isAuthenticated]);

    const loadCases = async () => { try { const c = await apiService.getCases(); setCases(c); } catch {} };
    const fetchArchiveContent = async () => {
        const active = breadcrumbs[breadcrumbs.length - 1];
        if (!loading) setLoading(true);
        try {
            let rawItems: any[] = [];
            if (active.type === 'ROOT') rawItems = await apiService.getArchiveItems(undefined, undefined, "null");
            else if (active.type === 'CASE') rawItems = await apiService.getArchiveItems(undefined, active.id!, "null");
            else if (active.type === 'FOLDER') rawItems = await apiService.getArchiveItems(undefined, undefined, active.id!);
            const sanitizedItems = rawItems.filter(item => item && (item._id || item.id)).map(item => ({ ...item, id: item._id || item.id }));
            setArchiveItems(sanitizedItems);
        } catch(e) { console.error("Failed to fetch archive content:", e); } finally { setLoading(false); }
    };
    const handleNavigate = (_: Breadcrumb, index: number) => setBreadcrumbs(prev => prev.slice(0, index + 1));
    const handleEnterFolder = (id: string, name: string, type: 'FOLDER' | 'CASE') => setBreadcrumbs(prev => [...prev, { id, name: translateSystemName(name), type }]);
    const handleCreateFolder = async (e: React.FormEvent) => { e.preventDefault(); const active = breadcrumbs[breadcrumbs.length - 1]; try { await apiService.createArchiveFolder(newFolderName, active.type === 'FOLDER' ? active.id! : undefined, active.type === 'CASE' ? active.id! : undefined, newFolderCategory); setShowFolderModal(false); setNewFolderName(""); fetchArchiveContent(); } catch { alert(t('error.generic')); } };
    const handleSmartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if(!f) return; setIsUploading(true); const active = breadcrumbs[breadcrumbs.length - 1]; try { await apiService.uploadArchiveItem(f, f.name, "GENERAL", active.type === 'CASE' ? active.id! : undefined, active.type === 'FOLDER' ? active.id! : undefined); fetchArchiveContent(); } catch { alert(t('error.uploadFailed')); } finally { setIsUploading(false); } };
    const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const files = e.target.files; if (!files || files.length === 0) return; setIsUploading(true); const active = breadcrumbs[breadcrumbs.length - 1]; try { const firstPath = files[0].webkitRelativePath || ""; const rootFolderName = firstPath.split('/')[0] || t('archive.newFolderDefault'); const newFolder = await apiService.createArchiveFolder(rootFolderName, active.type === 'FOLDER' ? active.id! : undefined, active.type === 'CASE' ? active.id! : undefined, "GENERAL"); if (!newFolder || !newFolder.id) throw new Error("Failed to create folder"); const uploadPromises = Array.from(files).map(file => { if (file.name.startsWith('.')) return Promise.resolve(); return apiService.uploadArchiveItem(file, file.name, "GENERAL", active.type === 'CASE' ? active.id! : undefined, newFolder.id); }); await Promise.all(uploadPromises); fetchArchiveContent(); } catch { alert(t('error.uploadFailed')); } finally { setIsUploading(false); if (folderInputRef.current) folderInputRef.current.value = ''; } };
    const downloadArchiveItem = async (id: string, title: string) => { try { await apiService.downloadArchiveItem(id, title); } catch { alert(t('error.generic')); } };
    const deleteArchiveItem = async (id: string) => { if(!window.confirm(t('general.confirmDelete'))) return; try { await apiService.deleteArchiveItem(id); fetchArchiveContent(); } catch { alert(t('error.generic')); } };
    const handleViewItem = async (item: ArchiveItemOut) => { setOpeningDocId(item.id); try { const blob = await apiService.getArchiveFileBlob(item.id); const url = window.URL.createObjectURL(blob); setViewingUrl(url); setViewingDoc({ id: item.id, file_name: item.title, mime_type: getMimeType(item.file_type, item.title), status: 'READY' } as any); } catch { alert(t('error.generic')); } finally { setOpeningDocId(null); } };
    const closePreview = () => { setViewingDoc(null); if(viewingUrl) window.URL.revokeObjectURL(viewingUrl); };
    const handleRenameClick = (item: ArchiveItemOut) => { setItemToRename(item); setRenameValue(item.title); };
    const submitRename = async (e: React.FormEvent) => { e.preventDefault(); if (!itemToRename || !renameValue.trim()) return; try { await apiService.renameArchiveItem(itemToRename.id, renameValue); setArchiveItems(prev => prev.map(i => i.id === itemToRename.id ? { ...i, title: renameValue } : i)); setItemToRename(null); } catch (error) { alert(t('error.generic')); } };
    const handleShareItem = async (item: ArchiveItemOut) => { try { const newStatus = !item.is_shared; await apiService.shareArchiveItem(item.id, newStatus); setArchiveItems(prev => prev.map(i => i.id === item.id ? { ...i, is_shared: newStatus } : i)); } catch (e) { alert(t('error.generic')); } };
    
    const currentView = breadcrumbs[breadcrumbs.length - 1];
    const isInsideCase = currentView.type === 'CASE'; 
    const filteredCases = cases.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.case_number.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredItems = archiveItems.filter(item => { if (currentView.type === 'ROOT' && item.case_id) return false; return item.title.toLowerCase().includes(searchTerm.toLowerCase()); });
    
    if (loading) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>;

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <style>{` .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 10px; } ::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.5); } select option { background-color: #0f172a; color: #f9fafb; } `}</style>
            
            <div className="bg-gray-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
                 <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input type="text" placeholder={t('header.searchPlaceholder') || "Kërko..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-base text-white focus:outline-none focus:border-indigo-500/50 focus:bg-black/60 transition-all shadow-inner placeholder:text-gray-600" />
                    </div>
                    <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                        {isInsideCase && currentView.id && ( <ActionButton icon={<LinkIcon size={20} />} label="PORTAL" onClick={() => setShowShareModal(true)} /> )}
                        <ActionButton icon={<FolderPlus size={20} />} label="Krijo Dosje" onClick={() => setShowFolderModal(true)} />
                        <input type="file" ref={folderInputRef} onChange={handleFolderUpload} className="hidden" {...({ webkitdirectory: "", directory: "" } as any)} multiple />
                        <input type="file" ref={archiveInputRef} className="hidden" onChange={handleSmartUpload} />
                        <ActionButton icon={<FolderUp size={20} />} label={t('archive.uploadFolderTooltip')} onClick={() => folderInputRef.current?.click()} disabled={isUploading}/>
                        <ActionButton primary icon={isUploading ? <Loader2 className="animate-spin" size={20} /> : <FileUp size={20} />} label="Ngarko" onClick={() => archiveInputRef.current?.click()} disabled={isUploading} />
                    </div>
                 </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto text-sm no-scrollbar pb-2">
                {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.id || 'root'}>
                        <button onClick={() => handleNavigate(crumb, index)} className={` flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl transition-all border ${index === breadcrumbs.length - 1 ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 font-bold shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'text-gray-500 border-transparent hover:text-white hover:bg-white/5'} `}>
                            {crumb.type === 'ROOT' ? <Archive size={16} /> : crumb.type === 'CASE' ? <Briefcase size={16} /> : <FolderOpen size={16} />}
                            {translateSystemName(crumb.name)}
                        </button>
                        {index < breadcrumbs.length - 1 && <ChevronRight size={16} className="text-gray-700 flex-shrink-0" />}
                    </React.Fragment>
                ))}
            </div>
            
            <div className="bg-gray-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-md min-h-[600px] shadow-2xl">
                {currentView.type === 'ROOT' && filteredCases.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCases.map(c => ( <div key={c.id} className="h-full"> <ArchiveCard title={translateSystemName(c.title || `Projekti #${c.case_number}`)} subtitle={c.case_number || 'Pa numër'} type="Dosje Projekti" date={new Date(c.created_at).toLocaleDateString()} icon={<Briefcase className="w-6 h-6 text-indigo-400" />} isFolder={true} isShared={c.is_shared} onClick={() => handleEnterFolder(c.id, c.title, 'CASE')} /> </div> ))}
                    </div>
                )}
                {filteredItems.length > 0 && (
                    <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <AnimatePresence>
                            {filteredItems.map(item => {
                                if (!item || !item.id) return null;
                                const isFolder = item.item_type === 'FOLDER'; 
                                const fileExt = item.file_type || 'FILE'; 
                                return (
                                    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={item.id} className="h-full">
                                        <ArchiveCard 
                                            title={translateSystemName(item.title)} 
                                            subtitle={isFolder ? t('archive.caseFolders') : `${fileExt} Dokument`} 
                                            type={isFolder ? 'Folder' : fileExt} 
                                            date={new Date(item.created_at).toLocaleDateString()} 
                                            icon={isFolder ? <FolderOpen className="w-6 h-6 text-amber-500" /> : getFileIcon(fileExt)} 
                                            isFolder={isFolder} 
                                            isShared={item.is_shared}
                                            isLoading={openingDocId === item.id}
                                            indexingStatus={item.indexing_status}
                                            onClick={() => isFolder ? handleEnterFolder(item.id, item.title, 'FOLDER') : handleViewItem(item)} 
                                            onDownload={() => downloadArchiveItem(item.id, item.title)} 
                                            onDelete={() => deleteArchiveItem(item.id)}
                                            onRename={() => handleRenameClick(item)} 
                                            onShare={() => handleShareItem(item)}
                                        />
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </motion.div>
                )}
                {filteredCases.length === 0 && filteredItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                        <FolderOpen size={64} className="mb-4 opacity-20" />
                        <p>{t('archive.emptyFolder')}</p>
                    </div>
                )}
            </div>
            
            {showFolderModal && ( <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"> <div className="bg-[#0f172a] border border-indigo-500/20 rounded-3xl w-full max-w-sm p-6 shadow-2xl shadow-indigo-900/20"> <div className="flex justify-between items-center mb-6"> <h3 className="text-xl font-bold text-white">{t('archive.newFolderTitle')}</h3> <button onClick={() => setShowFolderModal(false)} className="text-gray-500 hover:text-white"><X size={24}/></button> </div> <form onSubmit={handleCreateFolder}> <div className="relative mb-5"> <FolderOpen className="absolute left-4 top-3.5 w-6 h-6 text-amber-500" /> <input autoFocus type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder={t('archive.folderNamePlaceholder')} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white text-base focus:border-indigo-500/50 outline-none transition-all placeholder:text-gray-600" /> </div> <div className="relative mb-8"> <Tag className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" /> <select value={newFolderCategory} onChange={(e) => setNewFolderCategory(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-gray-300 focus:border-indigo-500/50 outline-none appearance-none cursor-pointer text-base"> <option value="GENERAL">{t('category.general')}</option> <option value="EVIDENCE">{t('category.evidence')}</option> <option value="LEGAL_DOCS">{t('category.legalDocs')}</option> <option value="INVOICES">{t('category.invoices')}</option> <option value="CONTRACTS">{t('category.contracts')}</option> </select> </div> <div className="flex justify-end gap-3"> <button type="button" onClick={() => setShowFolderModal(false)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors font-medium">{t('general.cancel')}</button> <button type="submit" className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all transform hover:scale-[1.02]">{t('general.create')}</button> </div> </form> </div> </div> )}
            {itemToRename && ( <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"> <div className="bg-[#0f172a] border border-blue-500/20 rounded-3xl w-full max-w-sm p-6 shadow-2xl"> <div className="flex justify-between items-center mb-6"> <h3 className="text-xl font-bold text-white">{t('documentsPanel.renameTitle')}</h3> <button onClick={() => setItemToRename(null)} className="text-gray-500 hover:text-white"><X size={24}/></button> </div> <form onSubmit={submitRename}> <div className="relative mb-5"> <Pencil className="absolute left-4 top-3.5 w-5 h-5 text-blue-400" /> <input autoFocus type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white text-base focus:border-blue-500/50 outline-none transition-all" /> </div> <div className="flex justify-end gap-3"> <button type="button" onClick={() => setItemToRename(null)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors font-medium">{t('general.cancel')}</button> <button type="submit" className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02] flex items-center gap-2"><Save size={16} /> {t('general.save')}</button> </div> </form> </div> </div> )}
            {viewingDoc && <PDFViewerModal documentData={viewingDoc} onClose={closePreview} onMinimize={closePreview} t={t} directUrl={viewingUrl} />}
            {isInsideCase && currentView.id && ( <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} caseId={currentView.id} caseTitle={currentView.name} /> )}
        </motion.div>
    );
};