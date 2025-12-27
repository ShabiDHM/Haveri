// FILE: src/pages/ClientPortalPage.tsx
// PHOENIX PROTOCOL - CLIENT PORTAL V7.0 (TACTICAL UPGRADE)
// 1. STYLE: Applied Phoenix Glassmorphism to all UI elements for consistency.
// 2. CONSISTENCY: Aligned layout, components, and spacing with the new UI standard.
// 3. UX: Enhanced all interactive states for a premium, tactical feel.

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
        <div className="min-h-screen bg-[#030711] flex flex-col items-center justify-center text-white">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-500 text-sm font-medium tracking-widest uppercase animate-pulse">{t('portal.loading')}</p>
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen bg-[#030711] flex flex-col items-center justify-center p-6">
            <div className="bg-rose-900/10 border border-rose-500/20 p-12 rounded-3xl text-center max-w-md backdrop-blur-xl">
                <ShieldCheck className="w-16 h-16 text-rose-900/50 mx-auto mb-6" />
                <h1 className="text-2xl font-bold text-white mb-2">{t('portal.access_denied')}</h1>
                <p className="text-gray-400 leading-relaxed">{error}</p>
            </div>
        </div>
    );

    const logoSrc = getLogoUrl();
    const currentDate = new Date().toLocaleDateString('sq-AL', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="min-h-screen bg-[#030711] font-sans text-white selection:bg-blue-500 selection:text-white pb-24 relative overflow-x-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 bg-gradient-to-br from-indigo-900/10 via-transparent to-emerald-900/5 pointer-events-none" />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-gray-950/50 backdrop-blur-lg border-b border-white/10">
                <div className="max-w-5xl mx-auto px-6 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {logoSrc ? (
                            <img src={logoSrc} alt="Logo" className="w-12 h-12 rounded-xl object-contain bg-black/20 border border-white/10" onError={() => setImgError(true)}/>
                        ) : (
                            <div className="w-12 h-12 bg-gray-900/60 rounded-xl border border-white/10 flex items-center justify-center"><Building2 className="text-gray-600 w-6 h-6" /></div>
                        )}
                        <div className="flex flex-col">
                            <span className="font-bold text-base tracking-wide text-white">{data.organization_name || t('branding.fallback', 'Portal')}</span>
                            <span className="text-xs text-gray-500 tracking-wider uppercase font-medium">Portali i Klientit</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                        <ShieldCheck size={14} />
                        <span className="hidden sm:inline">{t('portal.secure_connection')}</span>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 pt-12 relative z-10">
                {/* Hero Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative group mb-12">
                    <div className="relative bg-gray-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 sm:p-12 overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                        
                        <div className="flex flex-col gap-10">
                            <div>
                                <h1 className="text-5xl sm:text-6xl font-black text-white leading-tight tracking-tighter">{data.title}</h1>
                                <p className="mt-4 text-gray-400 text-lg max-w-2xl">Mirësevini në panelin tuaj. Këtu mund të gjeni të gjitha dokumentet dhe informacionet e projektit.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-white/10 pt-10">
                                <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 border border-white/10"><Briefcase size={20} /></div><div className="flex flex-col"><span className="text-xs uppercase font-bold text-gray-500 tracking-wider">{t('portal.client_label')}</span><span className="text-sm font-medium text-white">{data.client_name}</span></div></div>
                                <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 border border-white/10"><Hash size={20} /></div><div className="flex flex-col"><span className="text-xs uppercase font-bold text-gray-500 tracking-wider">{t('portal.reference', 'Referenca')}</span><span className="text-sm font-medium text-white">{data.case_number || '---'}</span></div></div>
                                <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 border border-white/10"><Activity size={20} /></div><div className="flex flex-col"><span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Statusi</span><span className="text-sm font-bold text-white uppercase">{data.status}</span></div></div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="flex items-end justify-between mb-8 px-2">
                    <div className="flex items-center gap-4"><div className="h-8 w-1.5 bg-gradient-to-b from-blue-500 to-emerald-500 rounded-full" /><h2 className="text-3xl font-bold text-white tracking-tight">{t('portal.documents')}</h2><span className="text-lg text-gray-600 font-mono ml-2">({data.documents.length})</span></div>
                    <span className="text-xs text-gray-600 font-mono hidden sm:block">Sot: {currentDate}</span>
                </div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 gap-4">
                    {data.documents.length === 0 ? (
                        <div className="text-center py-24 bg-gray-900/40 border border-dashed border-white/10 rounded-3xl backdrop-blur-md">
                            <div className="w-20 h-20 bg-gray-900/60 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-lg"><FileText className="text-gray-600" size={32} /></div>
                            <p className="text-gray-500 font-medium">{t('portal.empty_documents')}</p>
                        </div>
                    ) : (
                        data.documents.map((doc, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 + 0.3 }} className="group relative bg-gray-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-gray-800/60 hover:border-blue-500/20 transition-all duration-300">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-5 min-w-0">
                                        <div className="w-16 h-16 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-emerald-400 transition-all shadow-lg"><FileText size={28} strokeWidth={1.5} /></div>
                                        <div className="flex flex-col min-w-0 gap-1">
                                            <h4 className="text-base font-semibold text-white truncate pr-4 group-hover:text-blue-400 transition-colors">{doc.file_name}</h4>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2 text-xs text-gray-500"><Calendar size={14} /><span className="font-mono">{new Date(doc.created_at).toLocaleDateString()}</span></div>
                                                {doc.source === 'ARCHIVE' && (<span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">{t('portal.archive')}</span>)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => handleView(doc.id, doc.source, doc.file_name, doc.file_type)} className="hidden sm:flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-sm font-medium border border-white/10 transition-all"><Eye size={16} /><span>{t('actions.view')}</span></button>
                                        <button onClick={() => handleDownload(doc.id, doc.source, doc.file_name)} className="p-4 sm:px-5 sm:py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/20 transition-all flex items-center gap-3" title={t('actions.download')}><Download size={16} /><span className="hidden sm:inline text-sm font-bold">{t('actions.download')}</span></button>
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