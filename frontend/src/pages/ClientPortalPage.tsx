// FILE: src/pages/ClientPortalPage.tsx
// PHOENIX PROTOCOL - PORTAL V8.6 (CLEANUP)
// 1. UI/UX: Removed 'Komunikim i Sigurt' footer from the contact panel as requested.

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Loader2, FileText, ShieldCheck, Building2, Download,
    Calendar, Eye, Quote, AlignLeft, User, Mail, MessageSquare, Send, Phone,
    MapPin, Globe
} from 'lucide-react';
import { API_V1_URL, apiService } from '../services/api';
import PDFViewerModal from '../components/PDFViewerModal';
import { Document } from '../data/types';
import { useTranslation } from 'react-i18next';

// --- TYPES ---
interface SharedDocument { id: string; file_name: string; created_at: string; file_type: string; source: 'ACTIVE' | 'ARCHIVE'; }
interface PublicCaseData { 
    case_number: string; title: string; client_name: string; status: string; 
    organization_name?: string; description?: string; logo?: string; 
    owner_address?: string; address?: string; owner_nui?: string; nui?: string;
    tax_id?: string; owner_email?: string; email?: string; owner_phone?: string; phone?: string;
    owner_website?: string; owner_city?: string;
    documents: SharedDocument[]; 
}

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
    const [formState, setFormState] = useState({ firstName: '', lastName: '', email: '', phone: '', message: '' });
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    useEffect(() => {
        const fetchPublicData = async () => {
            if (!caseId) { setError("Invalid Project ID."); setLoading(false); return; }
            try {
                const response = await apiService.axiosInstance.get(`${API_V1_URL}/share/portal/${caseId}`);
                setData(response.data);
                if (response.data) { document.title = `${response.data.title} | ${response.data.organization_name || 'Portal'}`; }
            } catch (err) { console.error(err); setError(t('portal.error_not_found')); } finally { setLoading(false); }
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

    const handleView = async (docId: string, source: 'ACTIVE' | 'ARCHIVE', filename: string, mimeType: string) => { try { const blob = source === 'ACTIVE' ? await apiService.getOriginalDocument(caseId!, docId) : await apiService.getArchiveFileBlob(docId); const url = window.URL.createObjectURL(blob); setViewingUrl(url); setViewingDoc({ id: docId, file_name: filename, mime_type: mimeType, status: 'READY' } as Document); } catch { alert("Could not load document preview."); } };
    const handleDownload = async (docId: string, source: 'ACTIVE' | 'ARCHIVE', filename: string) => { try { if (source === 'ACTIVE') { const blob = await apiService.getOriginalDocument(caseId!, docId); const url = window.URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.setAttribute('download', filename); document.body.appendChild(link); link.click(); link.parentNode?.removeChild(link); window.URL.revokeObjectURL(url); } else { await apiService.downloadArchiveItem(docId, filename); } } catch { alert("Could not download document."); } };
    const handleSendMessage = async (e: React.FormEvent) => { e.preventDefault(); setSending(true); try { await apiService.sendClientMessage(caseId!, formState); setSent(true); setFormState({ firstName: '', lastName: '', email: '', phone: '', message: '' }); setTimeout(() => setSent(false), 5000); } catch { alert("Dërgimi dështoi."); } finally { setSending(false); } };
    const closeViewer = () => { if (viewingUrl) URL.revokeObjectURL(viewingUrl); setViewingDoc(null); setViewingUrl(null); };

    // --- PHOENIX: REDESIGNED INFO ROW ---
    const InfoRow = ({ icon: Icon, label, value, isLink = false }: { icon: any, label: string, value?: string, isLink?: boolean }) => {
        if (!value) return null;
        return (
            <div className="flex items-start gap-5 relative group">
                <div className="relative z-10 p-3 rounded-xl bg-[#020617] border border-white/10 text-blue-400 shadow-sm group-hover:border-blue-500/30 group-hover:text-blue-300 transition-all duration-300 shrink-0">
                    <Icon size={20} strokeWidth={1.5} />
                </div>
                
                <div className="flex-1 pt-1.5 min-w-0">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 group-hover:text-blue-400/70 transition-colors">{label}</h4>
                    {isLink ? (
                        <a 
                            href={value.startsWith('http') ? value : `https://${value}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-sm sm:text-base font-medium text-white hover:text-blue-400 transition-colors leading-relaxed block break-all"
                        >
                            {value}
                        </a>
                    ) : (
                        <p className="text-sm sm:text-base font-medium text-white leading-relaxed break-words">{value}</p>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return ( <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="w-12 h-12 text-emerald-500 animate-spin" /></div> );
    if (error || !data) return ( <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6"><div className="bg-rose-900/10 border border-rose-500/20 p-12 rounded-3xl text-center"><ShieldCheck className="w-16 h-16 text-rose-900/50 mx-auto mb-6" /><h1 className="text-2xl font-bold text-white mb-2">{t('portal.access_denied')}</h1><p className="text-gray-400">{error}</p></div></div> );

    const logoSrc = getLogoUrl();
    const currentDate = new Date().toLocaleDateString('sq-AL', { year: 'numeric', month: 'long', day: 'numeric' });
    const directorMessage = data.description || "Të nderuar, bashkëngjitur gjeni dokumentacionin e përgatitur për rishikimin tuaj.";
    
    const businessName = data.organization_name;
    const businessAddress = data.owner_address || data.address;
    const businessNui = data.owner_nui || data.nui || data.tax_id;
    const businessEmail = data.owner_email || data.email;
    const businessPhone = data.owner_phone || data.phone;
    const businessWebsite = data.owner_website;
    const businessCity = data.owner_city;

    return (
        <div className="min-h-screen bg-[#020617] font-sans text-white selection:bg-emerald-500/30 pb-24 relative overflow-x-hidden">
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/20 via-[#020617] to-[#020617] pointer-events-none" />
            <header className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5"><div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between"><div className="flex items-center gap-5">{logoSrc ? <img src={logoSrc} alt="Logo" className="w-12 h-12 rounded-xl object-contain bg-black/20 border border-white/10" onError={() => setImgError(true)}/> : <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center"><Building2 className="text-gray-400 w-6 h-6" /></div>}<div className="flex flex-col"><span className="font-bold text-lg tracking-tight text-white leading-none mb-1">{businessName || 'Portal'}</span>{(businessAddress || businessNui) ? (<div className="flex flex-col gap-0.5"><div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">{businessAddress && <span>{businessAddress}</span>}{businessNui && <span className="opacity-50">|</span>}{businessNui && <span>NUI: {businessNui}</span>}</div></div>) : (<span className="text-[10px] text-gray-500 tracking-widest uppercase font-medium">Portali i Klientit</span>)}</div></div><div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/5 px-3 py-1.5 rounded-full border border-emerald-500/10"><ShieldCheck size={12} /><span className="hidden sm:inline uppercase tracking-wider">Lidhje e Sigurt</span></div></div></header>
            <main className="max-w-6xl mx-auto px-6 pt-12 relative z-10 space-y-16">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start"><div className="space-y-6 pt-4"><div className="inline-flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 text-xs font-bold uppercase tracking-widest"><Calendar size={12} /> {currentDate}</div><div><h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] mb-4">Përshëndetje,</h1><p className="text-gray-400 text-lg font-light leading-relaxed max-w-md">Këtu do të gjeni pasqyrën e plotë të dokumentacionit dhe komunikimet.</p></div></div><div className="relative group"><div className="absolute -inset-1 bg-gradient-to-br from-emerald-500/20 via-transparent to-blue-500/20 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition"></div><div className="relative bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl"><div className="flex items-start justify-between mb-6"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg border border-white/10"><Quote size={18} className="text-white" /></div><div><h3 className="text-sm font-bold text-white uppercase tracking-wider">Njoftim</h3><p className="text-[10px] text-emerald-400 font-mono mt-0.5 uppercase tracking-widest">Nga Drejtoria</p></div></div><AlignLeft className="text-white/20" size={24} /></div><div className="prose prose-invert prose-sm max-w-none"><p className="text-gray-300 leading-relaxed font-light whitespace-pre-wrap">{directorMessage}</p></div></div></div></motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}><div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4"><div className="flex items-center gap-4"><div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-emerald-500 rounded-full" /><h2 className="text-2xl font-bold text-white tracking-tight">Dokumentet</h2></div><span className="bg-white/5 border border-white/10 text-gray-400 px-3 py-1 rounded-full text-xs font-mono">{data.documents.length} skedarë</span></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{data.documents.length === 0 ? (<div className="col-span-full border border-dashed border-white/10 rounded-3xl p-16 text-center bg-white/5"><div className="w-16 h-16 bg-black/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5"><FileText className="text-gray-600" size={24} /></div><p className="text-gray-500 font-medium">Nuk ka dokumente të disponueshme për momentin.</p></div>) : (data.documents.map((doc, i) => (<motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 + 0.4 }} className="group relative bg-[#1e293b]/40 hover:bg-[#1e293b]/80 border border-white/5 hover:border-emerald-500/30 rounded-2xl p-6 transition-all duration-300 flex flex-col h-48 overflow-hidden"><div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500 pointer-events-none" /><div className="flex justify-between items-start mb-4 relative z-10"><div className="p-3 bg-black/40 rounded-xl text-emerald-400 group-hover:text-emerald-300 border border-white/5 transition-colors shadow-lg"><FileText size={20} /></div><div className="flex gap-2"><button onClick={() => handleView(doc.id, doc.source, doc.file_name, doc.file_type)} className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5" title="Shiko"><Eye size={16} /></button></div></div><div className="relative z-10 flex-1"><h4 className="font-bold text-gray-200 group-hover:text-white line-clamp-2 leading-snug text-base mb-1">{doc.file_name}</h4><div className="flex items-center gap-2 text-xs text-gray-500"><Calendar size={12} /><span>{new Date(doc.created_at).toLocaleDateString()}</span></div></div><div className="relative z-10 mt-4 pt-4 border-t border-white/5 flex justify-between items-center"><span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{doc.file_type || 'PDF'}</span><button onClick={() => handleDownload(doc.id, doc.source, doc.file_name)} className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider">Shkarko <Download size={12} /></button></div></motion.div>)))}</div></motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="pt-8">
                    <div className="bg-[#0f172a]/50 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative backdrop-blur-md">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600" />
                        <div className="grid grid-cols-1 lg:grid-cols-5">
                            {/* PHOENIX: LEFT COLUMN */}
                            <div className="lg:col-span-2 p-8 sm:p-10 bg-[#020617]/30 flex flex-col border-b lg:border-b-0 lg:border-r border-white/5 relative min-h-[500px]">
                                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
                                <div className="relative z-10 flex flex-col h-full justify-center">
                                    <div className="mb-10">
                                        <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">Informacion Kontaktues</h3>
                                        <p className="text-gray-400 leading-relaxed font-light">Detajet tona për kontakt të drejtpërdrejtë.</p>
                                    </div>
                                    <div className="space-y-8 flex-1">
                                        <InfoRow icon={Mail} label="Email Publik" value={businessEmail} />
                                        <InfoRow icon={Phone} label="Numri i Telefonit" value={businessPhone} />
                                        <InfoRow icon={MapPin} label="Adresa" value={businessAddress} />
                                        {(businessCity) && <InfoRow icon={MapPin} label="Qyteti" value={businessCity} />}
                                        <InfoRow icon={Globe} label="Website" value={businessWebsite} isLink={true} />
                                    </div>
                                    {/* Footer Removed here */}
                                </div>
                            </div>

                            {/* RIGHT COLUMN - FORM */}
                            <div className="lg:col-span-3 p-8 sm:p-10 flex flex-col justify-center">
                                {sent ? (<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col items-center justify-center text-center py-12"><div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 text-emerald-400 border border-emerald-500/30"><ShieldCheck size={32} /></div><h4 className="text-xl font-bold text-white mb-2">Mesazhi u dërgua me sukses!</h4><p className="text-gray-400">Faleminderit që na kontaktuat.</p></motion.div>) : (
                                    <form onSubmit={handleSendMessage} className="space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5"><div className="relative group"><User className="absolute left-3.5 top-3.5 text-gray-500 w-4 h-4 group-focus-within:text-blue-400 transition-colors" /><input type="text" placeholder="Emri" required value={formState.firstName} onChange={e => setFormState({...formState, firstName: e.target.value})} className="w-full bg-[#020617] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500/50 focus:bg-blue-500/5 focus:ring-1 focus:ring-blue-500/20 outline-none" /></div><div className="relative group"><User className="absolute left-3.5 top-3.5 text-gray-500 w-4 h-4 group-focus-within:text-blue-400 transition-colors" /><input type="text" placeholder="Mbiemri" required value={formState.lastName} onChange={e => setFormState({...formState, lastName: e.target.value})} className="w-full bg-[#020617] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500/50 focus:bg-blue-500/5 focus:ring-1 focus:ring-blue-500/20 outline-none" /></div></div>
                                        <div className="relative group"><Mail className="absolute left-3.5 top-3.5 text-gray-500 w-4 h-4 group-focus-within:text-blue-400 transition-colors" /><input type="email" placeholder="Email" required value={formState.email} onChange={e => setFormState({...formState, email: e.target.value})} className="w-full bg-[#020617] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500/50 focus:bg-blue-500/5 focus:ring-1 focus:ring-blue-500/20 outline-none" /></div>
                                        <div className="relative group"><Phone className="absolute left-3.5 top-3.5 text-gray-500 w-4 h-4 group-focus-within:text-blue-400 transition-colors" /><input type="tel" placeholder="Telefoni (Opsional)" value={formState.phone} onChange={e => setFormState({...formState, phone: e.target.value})} className="w-full bg-[#020617] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500/50 focus:bg-blue-500/5 focus:ring-1 focus:ring-blue-500/20 outline-none" /></div>
                                        <div className="relative group"><MessageSquare className="absolute left-3.5 top-3.5 text-gray-500 w-4 h-4 group-focus-within:text-blue-400 transition-colors" /><textarea placeholder="Mesazhi juaj..." rows={4} required value={formState.message} onChange={e => setFormState({...formState, message: e.target.value})} className="w-full bg-[#020617] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500/50 focus:bg-blue-500/5 focus:ring-1 focus:ring-blue-500/20 outline-none resize-none" /></div>
                                        <div className="pt-2"><button type="submit" disabled={sending} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01]">{sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} Dërgo Mesazhin</button></div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>
            {viewingDoc && <PDFViewerModal documentData={viewingDoc} onClose={closeViewer} t={t} directUrl={viewingUrl} isAuth={false} />}
        </div>
    );
};

export default ClientPortalPage;