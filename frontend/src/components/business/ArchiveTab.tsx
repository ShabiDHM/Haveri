// FILE: src/components/business/ArchiveTab.tsx
// PHOENIX PROTOCOL - ARCHIVE TAB V17.1 (UI ALIGNMENT)
// 1. UI: Merged Search and Action Buttons into a single "Action Bar".
// 2. UI: Standardized button styles for consistency.
// 3. STATUS: Production Ready.

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Home, Briefcase, FolderOpen, ChevronRight, FolderPlus, Loader2,
    Calendar, Info, Hash, FileText, FileImage, FileCode, File as FileIcon, Eye, Download, Trash2, Tag, X, Pencil, Save,
    FolderUp, FileUp, Search, Share2, Link as LinkIcon
} from 'lucide-react';
import { apiService } from '../../services/api';
import { ArchiveItemOut, Case, Document } from '../../data/types';
import { useTranslation } from 'react-i18next';
import PDFViewerModal from '../PDFViewerModal';
import ShareModal from '../ShareModal';

type Breadcrumb = { id: string | null; name: string; type: 'ROOT' | 'CASE' | 'FOLDER'; };

const getMimeType = (fileType: string, fileName: string) => { const ext = fileName.split('.').pop()?.toLowerCase() || ''; if (fileType === 'PDF' || ext === 'pdf') return 'application/pdf'; if (['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF'].includes(fileType)) return 'image/jpeg'; return 'application/octet-stream'; };
const getFileIcon = (fileType: string) => { const ft = fileType ? fileType.toUpperCase() : ""; if (ft === 'PDF') return <FileText className="w-5 h-5 text-red-400" />; if (['PNG', 'JPG', 'JPEG'].includes(ft)) return <FileImage className="w-5 h-5 text-purple-400" />; if (['JSON', 'JS', 'TS'].includes(ft)) return <FileCode className="w-5 h-5 text-yellow-400" />; return <FileIcon className="w-5 h-5 text-blue-400" />; };

const ArchiveCard = ({ title, subtitle, type, date, icon, onClick, onDownload, onDelete, onRename, onShare, isShared, isFolder, isLoading }: any) => {
    const { t } = useTranslation();
    return (
        <div onClick={onClick} className={`group relative flex flex-col justify-between h-full min-h-[12rem] sm:min-h-[14rem] p-4 sm:p-6 rounded-2xl transition-all duration-300 cursor-pointer bg-gray-900/40 backdrop-blur-md border border-white/5 shadow-xl hover:shadow-2xl hover:bg-gray-800/60 hover:-translate-y-1 hover:scale-[1.01]`}>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div>
                <div className="flex flex-col mb-3 sm:mb-4 relative z-10">
                    <div className="flex justify-between items-start gap-2">
                        <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-300">{icon}</div>
                        
                        {isShared && (
                            <div className="bg-green-500/10 text-green-400 p-1.5 rounded-lg border border-green-500/20 cursor-default" title={t('archive.isShared', 'E Ndarë me Klientin')}>
                                <Share2 size={14} />
                            </div>
                        )}
                    </div>
                    <div className="mt-3 sm:mt-4">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-100 line-clamp-2 leading-tight tracking-tight group-hover:text-primary-start transition-colors break-words">{title}</h2>
                        <div className="flex items-center gap-2 mt-2">
                            <Calendar className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-gray-600 flex-shrink-0" />
                            <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">{date}</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col mb-4 sm:mb-6 relative z-10">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3 pb-2 border-b border-white/5">
                        <Info className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-indigo-400" />
                        <span className="text-xs sm:text-sm font-bold text-gray-300 uppercase tracking-wider">{isFolder ? t('archive.contents') : t('archive.details')}</span>
                    </div>
                    <div className="space-y-1.5 pl-1">
                        <div className="flex items-center gap-2 text-sm sm:text-base font-medium text-gray-200">
                            {isFolder ? <FolderOpen className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-500" /> : <FileText className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-blue-500" />}
                            <span className="truncate">{type}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                            <Hash className="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0" />
                            <span className="truncate">{subtitle}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="relative z-10 pt-3 sm:pt-4 border-t border-white/5 flex items-center justify-between min-h-[2.5rem] sm:min-h-[3rem]">
                <span className="text-xs sm:text-sm font-medium text-indigo-400 group-hover:text-indigo-300 transition-colors flex items-center gap-1">{isFolder ? t('archive.openFolder') : ''}</span>
                <div className="flex gap-1 items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {!isFolder && onShare && (<button onClick={(e) => { e.stopPropagation(); onShare(); }} className={`p-1.5 sm:p-2 rounded-lg transition-colors ${isShared ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'text-gray-600 hover:text-white hover:bg-white/10'}`} title={isShared ? t('archive.unshare') : t('archive.share')}><Share2 className="h-4 w-4" /></button>)}
                    {onRename && (<button onClick={(e) => { e.stopPropagation(); onRename(); }} className="p-1.5 sm:p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/10 transition-colors" title={t('general.edit')}><Pencil className="h-4 w-4" /></button>)}
                    {!isFolder && <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="p-1.5 sm:p-2 rounded-lg text-gray-600 hover:text-blue-400 hover:bg-blue-400/10 transition-colors" title={t('general.view')}>{isLoading ? <Loader2 className="h-4 w-4 animate-spin text-blue-400" /> : <Eye className="h-4 w-4" />}</button>}
                    {!isFolder && onDownload && <button onClick={(e) => { e.stopPropagation(); onDownload(); }} className="p-1.5 sm:p-2 rounded-lg text-gray-600 hover:text-green-400 hover:bg-green-400/10 transition-colors" title={t('general.download')}><Download className="h-4 w-4" /></button>}
                    {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 sm:p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors" title={t('general.delete')}><Trash2 className="h-4 w-4" /></button>}
                </div>
            </div>
        </div>
    );
};

export const ArchiveTab: React.FC = () => {
    const { t } = useTranslation();
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

    useEffect(() => { loadCases(); }, []);
    useEffect(() => { fetchArchiveContent(); }, [breadcrumbs]);

    const loadCases = async () => { try { const c = await apiService.getCases(); setCases(c); } catch {} };
    const fetchArchiveContent = async () => { const active = breadcrumbs[breadcrumbs.length - 1]; setLoading(true); try { if (active.type === 'ROOT') setArchiveItems(await apiService.getArchiveItems(undefined, undefined, "null")); else if (active.type === 'CASE') setArchiveItems(await apiService.getArchiveItems(undefined, active.id!, "null")); else if (active.type === 'FOLDER') setArchiveItems(await apiService.getArchiveItems(undefined, undefined, active.id!)); } catch {} finally { setLoading(false); } };
    const handleNavigate = (_: Breadcrumb, index: number) => setBreadcrumbs(prev => prev.slice(0, index + 1));
    const handleEnterFolder = (id: string, name: string, type: 'FOLDER' | 'CASE') => setBreadcrumbs(prev => [...prev, { id, name, type }]);
    const handleCreateFolder = async (e: React.FormEvent) => { e.preventDefault(); const active = breadcrumbs[breadcrumbs.length - 1]; try { await apiService.createArchiveFolder(newFolderName, active.type === 'FOLDER' ? active.id! : undefined, active.type === 'CASE' ? active.id! : undefined, newFolderCategory); setShowFolderModal(false); fetchArchiveContent(); } catch { alert(t('error.generic')); } };
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
    
    if (loading) return <div className="flex justify-center h-64 items-center"><Loader2 className="animate-spin text-primary-start" /></div>;

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 sm:space-y-8">
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            
            {/* PHOENIX UI FIX: UNIFIED ACTION BAR */}
            <div className="flex flex-col md:flex-row gap-3 items-center bg-white/5 p-3 rounded-2xl border border-white/5">
                <div className="flex-1 w-full relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input type="text" placeholder={t('header.searchPlaceholder') || "Kërko..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-black/20 border border-white/5 rounded-xl text-base sm:text-sm focus:outline-none focus:border-primary-start/50 transition-all text-gray-200" />
                </div>
                
                <div className="flex w-full md:w-auto gap-2 flex-shrink-0">
                    {isInsideCase && currentView.id && (
                         <button 
                            onClick={() => setShowShareModal(true)} 
                            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-all font-medium text-sm"
                        >
                            <LinkIcon size={16} /> <span className="hidden sm:inline">PORTAL</span>
                        </button>
                    )}
                    <button onClick={() => setShowFolderModal(true)} className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-all font-medium text-sm"><FolderPlus size={16} /> <span className="hidden sm:inline">Krijo Dosje</span></button>
                    <div className="relative flex-1 md:flex-initial"><input type="file" ref={folderInputRef} onChange={handleFolderUpload} className="hidden" {...({ webkitdirectory: "", directory: "" } as any)} multiple /><button onClick={() => folderInputRef.current?.click()} disabled={isUploading} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-all font-medium text-sm disabled:opacity-50" title={t('archive.uploadFolderTooltip')}><FolderUp size={16} /></button></div>
                    <div className="relative flex-1 md:flex-initial"><input type="file" ref={archiveInputRef} className="hidden" onChange={handleSmartUpload} /><button onClick={() => archiveInputRef.current?.click()} disabled={isUploading} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-primary-start hover:bg-primary-end text-white rounded-lg font-bold transition-all text-sm">{isUploading ? <Loader2 className="animate-spin w-4 h-4" /> : <FileUp size={16} />}</button></div>
                </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto text-sm no-scrollbar pb-2">
                {breadcrumbs.map((crumb, index) => (<React.Fragment key={crumb.id || 'root'}><button onClick={() => handleNavigate(crumb, index)} className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${index === breadcrumbs.length - 1 ? 'bg-primary-start/20 text-primary-start font-bold border border-primary-start/20 shadow-inner' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>{crumb.type === 'ROOT' ? <Home size={14} /> : crumb.type === 'CASE' ? <Briefcase size={14} /> : <FolderOpen size={14} />}{crumb.name}</button>{index < breadcrumbs.length - 1 && <ChevronRight size={14} className="text-gray-600 flex-shrink-0" />}</React.Fragment>))}
            </div>
            
            <div className="space-y-8 sm:space-y-10">
                {currentView.type === 'ROOT' && filteredCases.length > 0 && (
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
                                    onClick={() => handleEnterFolder(c.id, c.title, 'CASE')} 
                                />
                            </div>
                        ))}
                    </div>
                )}
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
            </div>
            
            {showFolderModal && ( <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"><div className="bg-background-dark border border-glass-edge rounded-3xl w-full max-w-sm p-5 sm:p-8 shadow-2xl scale-100"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-white">{t('archive.newFolderTitle')}</h3><button onClick={() => setShowFolderModal(false)} className="text-gray-500 hover:text-white"><X size={24}/></button></div><form onSubmit={handleCreateFolder}><div className="relative mb-5"><FolderOpen className="absolute left-4 top-3.5 w-6 h-6 text-amber-500" /><input autoFocus type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder={t('archive.folderNamePlaceholder')} className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white text-base sm:text-lg focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder:text-gray-600" /></div><div className="relative mb-8"><Tag className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" /><select value={newFolderCategory} onChange={(e) => setNewFolderCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-gray-300 focus:ring-2 focus:ring-amber-500/50 outline-none appearance-none cursor-pointer text-base sm:text-lg"><option value="GENERAL">{t('category.general')}</option><option value="EVIDENCE">{t('category.evidence')}</option><option value="LEGAL_DOCS">{t('category.legalDocs')}</option><option value="INVOICES">{t('category.invoices')}</option><option value="CONTRACTS">{t('category.contracts')}</option></select></div><div className="flex justify-end gap-3"><button type="button" onClick={() => setShowFolderModal(false)} className="px-6 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium">{t('general.cancel')}</button><button type="submit" className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all transform hover:scale-[1.02]">{t('general.create')}</button></div></form></div></div> )}
            {itemToRename && ( <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"><div className="bg-background-dark border border-glass-edge rounded-3xl w-full max-w-sm p-5 sm:p-8 shadow-2xl scale-100"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-white">{t('documentsPanel.renameTitle')}</h3><button onClick={() => setItemToRename(null)} className="text-gray-500 hover:text-white"><X size={24}/></button></div><form onSubmit={submitRename}><div className="relative mb-5"><Pencil className="absolute left-4 top-3.5 w-5 h-5 text-blue-400" /><input autoFocus type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white text-base sm:text-lg focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" /></div><div className="flex justify-end gap-3"><button type="button" onClick={() => setItemToRename(null)} className="px-6 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium">{t('general.cancel')}</button><button type="submit" className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02] flex items-center gap-2"><Save size={16} /> {t('general.save')}</button></div></form></div></div> )}
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