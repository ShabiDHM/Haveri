// FILE: src/pages/ClientPortalPage.tsx
// PHOENIX PROTOCOL - CLIENT PORTAL V6.1 (BUSINESS REBRAND)
// 1. TERMINOLOGY: Shifted from "Legal/Case" to "Business/Project".
// 2. TEXT: "Numri i Lëndës" -> "Referenca". "Zyra Ligjore" -> "Business".
// 3. UI: Maintained premium glass look, refined for general business use.

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Loader2, 
    FileText, ShieldCheck, 
    Briefcase, Eye, Building2, Download,
    Calendar, Hash, Activity
} from 'lucide-react';
import { API_V1_URL, apiService } from '../services/api';
import PDFViewerModal from '../components/PDFViewerModal';
import { Document } from '../data/types';
import { useTranslation } from 'react-i18next';

// --- TYPES ---
interface SharedDocument { id: string; file_name: string; created_at: string; file_type: string; source: 'ACTIVE' | 'ARCHIVE'; }
interface PublicCaseData { case_number: string; title: string; client_name: string; status: string; organization_name?: string; logo?: string; documents: SharedDocument[]; }

// --- MAIN COMPONENT ---
const ClientPortalPage: React.FC = () => {
    const { caseId } = useParams<{ caseId: string }>();
    const { t } = useTranslation();
    const [data, setData] = useState<PublicCaseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [imgError, setImgError] = useState(false);

    const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
    const [viewingUrl, setViewingUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchPublicData = async () => {
            if (!caseId) {
                setError("Invalid Project ID.");
                setLoading(false);
                return;
            }
            try {
                const response = await apiService.axiosInstance.get(`${API_V1_URL}/share/portal/${caseId}`);
                const caseData = response.data;
                setData(caseData);
                if (caseData) {
                    document.title = `${caseData.title} | ${caseData.organization_name || 'Portal'}`;
                }
            } catch (err) {
                console.error(err);
                setError(t('portal.error_not_found'));
            } finally {
                setLoading(false);
            }
        };
        fetchPublicData();
    }, [caseId, t]);

    const getLogoUrl = () => {
        if (!data?.logo || imgError) return null;
        if (data.logo.startsWith('http')) return data.logo;
        const baseUrl = API_V1_URL.split('/api/v1')[0];
        const path = data.logo.startsWith('/') ? data.logo : `/${data.logo}`;
        return `${baseUrl}${path}`;
    };

    const handleView = async (docId: string, source: 'ACTIVE' | 'ARCHIVE', filename: string, mimeType: string) => {
        try {
            let blob: Blob;
            if(source === 'ACTIVE') {
                blob = await apiService.getOriginalDocument(caseId!, docId);
            } else {
                blob = await apiService.getArchiveFileBlob(docId);
            }
            const url = window.URL.createObjectURL(blob);
            setViewingUrl(url);
            setViewingDoc({ id: docId, file_name: filename, mime_type: mimeType, status: 'READY' } as Document);
        } catch {
            alert("Could not load document preview.");
        }
    };
    
    const handleDownload = async (docId: string, source: 'ACTIVE' | 'ARCHIVE', filename: string) => {
        try {
            if (source === 'ACTIVE') {
                const blob = await apiService.getOriginalDocument(caseId!, docId);
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
                window.URL.revokeObjectURL(url);
            } else {
                await apiService.downloadArchiveItem(docId, filename);
            }
        } catch {
            alert("Could not download document.");
        }
    };

    const closeViewer = () => {
        if (viewingUrl) URL.revokeObjectURL(viewingUrl);
        setViewingDoc(null);
        setViewingUrl(null);
    };

    if (loading) return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
            <Loader2 className="w-10 h-10 animate-spin text-neutral-500 mb-4" />
            <p className="text-neutral-500 text-xs font-medium tracking-[0.2em] uppercase animate-pulse">{t('portal.loading')}</p>
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6">
            <div className="bg-red-900/10 border border-red-500/10 p-12 rounded-2xl text-center max-w-md backdrop-blur-xl">
                <ShieldCheck className="w-12 h-12 text-red-900/50 mx-auto mb-6" />
                <h1 className="text-xl font-bold text-neutral-200 mb-2">{t('portal.access_denied')}</h1>
                <p className="text-neutral-500 text-sm leading-relaxed">{error}</p>
            </div>
        </div>
    );

    const logoSrc = getLogoUrl();
    const currentDate = new Date().toLocaleDateString('sq-AL', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="min-h-screen bg-neutral-950 font-sans text-neutral-100 selection:bg-neutral-800 selection:text-white pb-24 relative overflow-x-hidden">
            {/* Ambient Background - Neutral/Professional */}
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-900/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {logoSrc ? (
                            <img src={logoSrc} alt="Logo" className="w-10 h-10 rounded-xl object-contain bg-white/5 border border-white/5 shadow-inner" onError={() => setImgError(true)}/>
                        ) : (
                            <div className="w-10 h-10 bg-neutral-900 rounded-xl border border-white/5 flex items-center justify-center"><Building2 className="text-neutral-600 w-5 h-5" /></div>
                        )}
                        <div className="flex flex-col">
                            {/* Generic fallback 'Portal' if no org name found */}
                            <span className="font-semibold text-sm tracking-wide text-neutral-200">{data.organization_name || t('branding.fallback', 'Portal')}</span>
                            <span className="text-[10px] text-neutral-500 tracking-wider uppercase">Portal Klienti</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-medium text-emerald-500/80 bg-emerald-500/5 px-3 py-1.5 rounded-full border border-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                        <ShieldCheck size={12} />
                        <span className="hidden sm:inline">{t('portal.secure_connection')}</span>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 pt-12 relative z-10">
                {/* Hero Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="relative group mb-12"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-neutral-800/20 via-neutral-800/10 to-transparent rounded-[2rem] blur-xl opacity-50 group-hover:opacity-75 transition duration-1000" />
                    <div className="relative bg-neutral-900/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 sm:p-12 overflow-hidden">
                        {/* Decorative Shine */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                        
                        <div className="flex flex-col gap-8">
                            <div>
                                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] tracking-tight">{data.title}</h1>
                                <p className="mt-4 text-neutral-400 text-lg font-light max-w-2xl">
                                    Mirësevini në panelin tuaj. Këtu mund të gjeni të gjitha dokumentet dhe informacionet e projektit.
                                </p>
                            </div>

                            {/* Meta Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/5 pt-8">
                                <div className="flex items-center gap-4 group/item">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 group-hover/item:text-white transition-colors">
                                        <Briefcase size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-0.5">{t('portal.client_label')}</span>
                                        <span className="text-sm font-medium text-neutral-200">{data.client_name}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 group/item">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 group-hover/item:text-white transition-colors">
                                        <Hash size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        {/* RENAMED: 'Numri i Lëndës' -> 'Referenca' for general business context */}
                                        <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-0.5">{t('portal.reference', 'Referenca')}</span>
                                        <span className="text-sm font-medium text-neutral-200">{data.case_number || '---'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 group/item">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 group-hover/item:text-white transition-colors">
                                        <Activity size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-0.5">Statusi</span>
                                        <span className="text-sm font-medium text-neutral-200 uppercase">{data.status}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Section Divider */}
                <div className="flex items-end justify-between mb-6 px-2">
                    <div className="flex items-center gap-3">
                        <div className="h-6 w-1 bg-gradient-to-b from-indigo-500 to-emerald-500 rounded-full" />
                        <h2 className="text-2xl font-semibold text-white tracking-tight">{t('portal.documents')}</h2>
                        <span className="text-sm text-neutral-500 font-medium ml-2">({data.documents.length})</span>
                    </div>
                    <span className="text-xs text-neutral-600 font-mono hidden sm:block">Sot: {currentDate}</span>
                </div>

                {/* Document Grid */}
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-1 gap-4"
                >
                    {data.documents.length === 0 ? (
                        <div className="text-center py-24 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
                            <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-lg">
                                <FileText className="text-neutral-600" size={24} />
                            </div>
                            <p className="text-neutral-500 text-sm font-medium">{t('portal.empty_documents')}</p>
                        </div>
                    ) : (
                        data.documents.map((doc, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 + 0.3 }}
                                className="group relative bg-neutral-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 sm:p-5 hover:bg-white/[0.03] hover:border-white/10 transition-all duration-300"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-5 min-w-0">
                                        {/* Icon Box */}
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/5 flex items-center justify-center text-neutral-400 group-hover:text-emerald-400 group-hover:scale-105 transition-all shadow-lg shadow-black/20">
                                            <FileText size={24} strokeWidth={1.5} />
                                        </div>
                                        
                                        {/* Text Info */}
                                        <div className="flex flex-col min-w-0 gap-1">
                                            <h4 className="text-base font-semibold text-neutral-200 truncate pr-4 group-hover:text-white transition-colors">
                                                {doc.file_name}
                                            </h4>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                                    <Calendar size={12} />
                                                    <span className="font-mono">{new Date(doc.created_at).toLocaleDateString()}</span>
                                                </div>
                                                {doc.source === 'ARCHIVE' && (
                                                    <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                                                        {t('portal.archive')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleView(doc.id, doc.source, doc.file_name, doc.file_type)} 
                                            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white rounded-xl text-xs font-medium border border-transparent hover:border-white/10 transition-all"
                                        >
                                            <Eye size={14} />
                                            <span>{t('actions.view')}</span>
                                        </button>
                                        <button 
                                            onClick={() => handleDownload(doc.id, doc.source, doc.file_name)} 
                                            className="p-3 sm:px-4 sm:py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-xl border border-emerald-500/20 transition-all flex items-center gap-2"
                                            title={t('actions.download')}
                                        >
                                            <Download size={16} />
                                            <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">{t('actions.download')}</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </motion.div>
            </main>

            {viewingDoc && <PDFViewerModal documentData={viewingDoc} onClose={closeViewer} t={t} directUrl={viewingUrl} isAuth={false} />}
        </div>
    );
};

export default ClientPortalPage;