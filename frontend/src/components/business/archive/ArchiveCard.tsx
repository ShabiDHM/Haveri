// FILE: src/components/business/archive/ArchiveCard.tsx
// PHOENIX PROTOCOL - CARD LAYOUT FIX V1.1
// 1. UI FIX: Removed opacity classes to make action icons always visible.
// 2. LAYOUT FIX: Added 'flex-wrap' to the icon container to prevent overflow on narrow screens.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Calendar, Info, Hash, FileText, FolderOpen, Share2, 
    Eye, Download, Trash2, Pencil, Loader2, FileImage, FileCode, File as FileIcon
} from 'lucide-react';

interface ArchiveCardProps {
    title: string;
    subtitle: string;
    type: string;
    date: string;
    icon: React.ReactNode;
    onClick: () => void;
    onDownload?: () => void;
    onDelete?: () => void;
    onRename?: () => void;
    onShare?: () => void;
    isShared?: boolean;
    isFolder?: boolean;
    isLoading?: boolean;
}

const getFileIcon = (fileType: string) => { 
    const ft = fileType ? fileType.toUpperCase() : ""; 
    if (ft === 'PDF') return <FileText className="w-5 h-5 text-red-400" />; 
    if (['PNG', 'JPG', 'JPEG'].includes(ft)) return <FileImage className="w-5 h-5 text-purple-400" />; 
    if (['JSON', 'JS', 'TS'].includes(ft)) return <FileCode className="w-5 h-5 text-yellow-400" />; 
    return <FileIcon className="w-5 h-5 text-blue-400" />; 
};

export const ArchiveCard: React.FC<ArchiveCardProps> = ({ 
    title, subtitle, type, date, icon, onClick, onDownload, onDelete, onRename, onShare, 
    isShared, isFolder, isLoading 
}) => {
    const { t } = useTranslation();

    return (
        <div onClick={onClick} className={`group relative flex flex-col justify-between h-full min-h-[12rem] sm:min-h-[14rem] p-4 sm:p-6 rounded-2xl transition-all duration-300 cursor-pointer bg-gray-900/40 backdrop-blur-md border border-white/5 shadow-xl hover:shadow-2xl hover:bg-gray-800/60 hover:-translate-y-1 hover:scale-[1.01]`}>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div>
                <div className="flex flex-col mb-3 sm:mb-4 relative z-10">
                    <div className="flex justify-between items-start gap-2">
                        <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                            {icon}
                        </div>
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
                
                {/* PHOENIX: Icons now always visible, with wrapping */}
                <div className="flex gap-1 items-center flex-wrap justify-end">
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

export { getFileIcon };