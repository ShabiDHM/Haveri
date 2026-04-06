// FILE: src/pages/ClientPortalPage.tsx
// PHOENIX PROTOCOL - PORTAL V11.4 (EXECUTIVE DESIGN SYSTEM)
// UPDATED: Semantic Tailwind classes (glass-panel, border-border-main, text-text-*, etc.)
// ADDED: shadow-sm, hover-lift, consistent backdrop blur.
// REMOVED: "Njoftim nga Drejtoria" (Management Notice) component per UX cleanup
// FIXED: Albanian date localization using date-fns with sq locale (browser-agnostic)
// FIXED: Simplified grid layout after notice removal
// RETAINED: All logic and functionality.

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Loader2, FileText, ShieldCheck, Building2, Download,
    Calendar, Eye, User, Mail, MessageSquare, Send, Phone,
    MapPin, Globe
} from 'lucide-react';
import { format } from 'date-fns';
import { sq } from 'date-fns/locale';
import { API_V1_URL, apiService } from '../services/api';
import PDFViewerModal from '../components/PDFViewerModal';
import { Document } from '../data/types';
import { useTranslation } from 'react-i18next';

// --- TYPES ---
interface SharedDocument { id: string; file_name: string; created_at: string; file_type: string; source: 'ACTIVE' | 'ARCHIVE'; }
interface PublicWorkspaceData { 
    workspace_number: string; title: string; client_name: string; status: string; 
    organization_name?: string; description?: string; logo?: string; 
    owner_address?: string; address?: string; owner_nui?: string; nui?: string;
    tax_id?: string; owner_email?: string; email?: string; owner_phone?: string; phone?: string;
    owner_website?: string; owner_city?: string;
    documents: SharedDocument[]; 
}

// --- MAIN COMPONENT ---
const ClientPortalPage: React.FC = () => {
    const { workspaceId } = useParams<{ workspaceId: string }>();
    const { t } = useTranslation();
    const [data, setData] = useState<PublicWorkspaceData | null>(null);
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
            if (!workspaceId) { setError("Invalid Workspace ID."); setLoading(false); return; }
            try {
                const response = await apiService.axiosInstance.get(`${API_V1_URL}/workspace/public/${workspaceId}/timeline`);
                setData(response.data);
                if (response.data) { document.title = `${response.data.title} | ${response.data.organization_name || 'Portal'}`; }
            } catch (err) { console.error(err); setError(t('portal.error_not_found')); } finally { setLoading(false); }
        };
        fetchPublicData();
    }, [workspaceId, t]);

    const getLogoUrl = () => {
        if (!data?.logo || imgError) return null;
        if (data.logo.startsWith('http')) return data.logo;
        const baseUrl = API_V1_URL.split('/api/v1')[0];
        const path = data.logo.startsWith('/') ? data.logo : `/${data.logo}`;
        return `${baseUrl}${path}`;
    };

    const handleView = async (docId: string, source: 'ACTIVE' | 'ARCHIVE', filename: string, mimeType: string) => { try { const blob = source === 'ACTIVE' ? await apiService.getOriginalDocument(workspaceId!, docId) : await apiService.getArchiveFileBlob(docId); const url = window.URL.createObjectURL(blob); setViewingUrl(url); setViewingDoc({ id: docId, file_name: filename, mime_type: mimeType, status: 'READY' } as Document); } catch { alert("Could not load document preview."); } };
    const handleDownload = async (docId: string, source: 'ACTIVE' | 'ARCHIVE', filename: string) => { try { if (source === 'ACTIVE') { const blob = await apiService.getOriginalDocument(workspaceId!, docId); const url = window.URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.setAttribute('download', filename); document.body.appendChild(link); link.click(); link.parentNode?.removeChild(link); window.URL.revokeObjectURL(url); } else { await apiService.downloadArchiveItem(docId, filename); } } catch { alert("Could not download document."); } };
    const handleSendMessage = async (e: React.FormEvent) => { e.preventDefault(); setSending(true); try { await apiService.sendClientMessage(workspaceId!, formState); setSent(true); setFormState({ firstName: '', lastName: '', email: '', phone: '', message: '' }); setTimeout(() => setSent(false), 5000); } catch { alert("Dërgimi dështoi."); } finally { setSending(false); } };
    const closeViewer = () => { if (viewingUrl) URL.revokeObjectURL(viewingUrl); setViewingDoc(null); setViewingUrl(null); };

    const InfoRow = ({ icon: Icon, label, value, isLink = false }: { icon: any, label: string, value?: string, isLink?: boolean }) => {
        if (!value) return null;
        return (
            <div className="flex items-start gap-5 relative group">
                <div className="relative z-10 p-3 rounded-xl bg-surface/30 backdrop-blur-sm border border-border-main text-primary-start shadow-sm group-hover:border-primary-start/30 group-hover:text-primary-start/80 transition-all duration-300 shrink-0">
                    <Icon size={20} strokeWidth={1.5} />
                </div>
                
                <div className="flex-1 pt-1.5 min-w-0">
                    <h4 className="text-xs font-black uppercase tracking-widest text-text-muted mb-1 group-hover:text-primary-start/70 transition-colors">{label}</h4>
                    {isLink ? (
                        <a 
                            href={value.startsWith('http') ? value : `https://${value}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-sm sm:text-base font-medium text-text-primary hover:text-primary-start transition-colors leading-relaxed block break-all hover-lift"
                        >
                            {value}
                        </a>
                    ) : (
                        <p className="text-sm sm:text-base font-medium text-text-primary leading-relaxed break-words">{value}</p>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return ( <div className="min-h-screen bg-canvas flex items-center justify-center"><Loader2 className="w-12 h-12 text-primary-start animate-spin" /></div> );
    if (error || !data) return ( <div className="min-h-screen bg-canvas flex items-center justify-center p-6"><div className="bg-danger-start/10 border border-danger-start/30 p-12 rounded-3xl text-center shadow-sm"><ShieldCheck className="w-16 h-16 text-danger-start/50 mx-auto mb-6" /><h1 className="text-2xl font-bold text-text-primary mb-2">{t('portal.access_denied')}</h1><p className="text-text-muted">{error}</p></div></div> );

    const logoSrc = getLogoUrl();
    // FORCED ALBANIAN DATE LOCALIZATION using date-fns with sq locale
    // This guarantees "Prill" appears instead of "April" regardless of browser/system settings
    const currentDate = format(new Date(), 'd MMMM yyyy', { locale: sq });
    
    const businessName = data.organization_name;
    const businessAddress = data.owner_address || data.address;
    const businessEmail = data.owner_email || data.email;
    const businessPhone = data.owner_phone || data.phone;
    const businessWebsite = data.owner_website;
    const businessCity = data.owner_city;

    return (
        <div className="min-h-screen bg-canvas font-sans text-text-primary pb-24 relative overflow-x-hidden">
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-start/10 via-canvas to-canvas pointer-events-none" />
            <header className="sticky top-0 z-50 bg-glass backdrop-blur-xl border-b border-border-main shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        {logoSrc ? (
                            <img src={logoSrc} alt="Logo" className="w-12 h-12 rounded-xl object-contain bg-surface/30 backdrop-blur-sm border border-border-main" onError={() => setImgError(true)}/>
                        ) : (
                            <div className="w-12 h-12 bg-surface/30 backdrop-blur-sm rounded-xl border border-border-main flex items-center justify-center"><Building2 className="text-text-muted w-6 h-6" /></div>
                        )}
                        <div className="flex flex-col justify-center">
                            <span className="font-bold text-lg tracking-tight text-text-primary leading-tight">{businessName || 'Portal'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-success-start bg-success-start/10 px-3 py-1.5 rounded-full border border-success-start/30 shadow-sm">
                        <ShieldCheck size={12} />
                        <span className="hidden sm:inline">Lidhje e Sigurt</span>
                    </div>
                </div>
            </header>
            <main className="max-w-6xl mx-auto px-6 pt-12 relative z-10 space-y-16">
                {/* Greeting Section - Simplified layout after management notice removal */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.1 }} 
                    className="pt-4"
                >
                    <div className="inline-flex items-center gap-2 text-success-start bg-success-start/10 px-3 py-1 rounded-lg border border-success-start/30 text-xs font-black uppercase tracking-widest shadow-sm">
                        <Calendar size={12} /> {currentDate}
                    </div>
                    <div>
                        <h1 className="text-5xl sm:text-6xl font-black text-text-primary tracking-tight leading-[1.1] mb-4 mt-6">
                            Përshëndetje,
                        </h1>
                        <p className="text-text-secondary text-lg font-light leading-relaxed max-w-xl">
                            Këtu do të gjeni pasqyrën e plotë të dokumentacionit dhe komunikimet.
                        </p>
                    </div>
                </motion.div>
                
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                    <div className="flex items-center justify-between mb-8 border-b border-border-main pb-4">
                        <div className="flex items-center gap-4">
                            <div className="h-8 w-1 bg-gradient-to-b from-primary-start to-success-start rounded-full" />
                            <h2 className="text-2xl font-bold text-text-primary tracking-tight">Dokumentet</h2>
                        </div>
                        <span className="bg-surface/30 backdrop-blur-sm border border-border-main text-text-muted px-3 py-1 rounded-full text-xs font-mono shadow-sm">{data.documents.length} skedarë</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {data.documents.length === 0 ? (
                            <div className="col-span-full border border-dashed border-border-main rounded-3xl p-16 text-center bg-surface/30 backdrop-blur-sm">
                                <div className="w-16 h-16 bg-surface/30 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border-main"><FileText className="text-text-muted" size={24} /></div>
                                <p className="text-text-muted font-medium">Nuk ka dokumente të disponueshme për momentin.</p>
                            </div>
                        ) : (
                            data.documents.map((doc, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 + 0.4 }} className="group relative bg-surface/40 hover:bg-surface/60 backdrop-blur-sm border border-border-main hover:border-success-start/30 rounded-2xl p-6 flex flex-col h-48 overflow-hidden hover-lift shadow-sm">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-success-start/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500 pointer-events-none" />
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className="p-3 bg-surface/30 backdrop-blur-sm rounded-xl text-success-start group-hover:text-success-start/80 border border-border-main shadow-sm"><FileText size={20} /></div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleView(doc.id, doc.source, doc.file_name, doc.file_type)} className="p-2 text-text-muted hover:text-text-primary bg-surface/30 hover:bg-surface rounded-lg transition-colors border border-border-main hover-lift shadow-sm" title="Shiko"><Eye size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="relative z-10 flex-1">
                                        <h4 className="font-bold text-text-primary group-hover:text-text-primary line-clamp-2 leading-snug text-base mb-1">{doc.file_name}</h4>
                                        <div className="flex items-center gap-2 text-xs text-text-muted">
                                            <Calendar size={12} />
                                            <span>{format(new Date(doc.created_at), 'd MMMM yyyy', { locale: sq })}</span>
                                        </div>
                                    </div>
                                    <div className="relative z-10 mt-4 pt-4 border-t border-border-main flex justify-between items-center">
                                        <span className="text-xs font-black uppercase tracking-widest text-text-muted">{doc.file_type || 'PDF'}</span>
                                        <button onClick={() => handleDownload(doc.id, doc.source, doc.file_name)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-success-start hover:text-success-start/80 transition-colors hover-lift">Shkarko <Download size={12} /></button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="pt-8">
                    <div className="glass-panel overflow-hidden shadow-sm relative border border-border-main">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-start via-primary-start to-primary-start" />
                        <div className="grid grid-cols-1 lg:grid-cols-5">
                            <div className="lg:col-span-2 p-8 sm:p-10 bg-base/30 flex flex-col border-b lg:border-b-0 lg:border-r border-border-main min-h-[500px]">
                                <div className="absolute inset-0 bg-gradient-to-b from-primary-start/5 to-transparent pointer-events-none" />
                                <div className="relative z-10 flex flex-col h-full justify-center">
                                    <div className="mb-10">
                                        <h3 className="text-3xl font-bold text-text-primary mb-3 tracking-tight">Informacion Kontaktues</h3>
                                        <p className="text-text-secondary leading-relaxed font-light">Detajet tona për kontakt të drejtpërdrejtë.</p>
                                    </div>
                                    <div className="space-y-8 flex-1">
                                        <InfoRow icon={Mail} label="Email Publik" value={businessEmail} />
                                        <InfoRow icon={Phone} label="Numri i Telefonit" value={businessPhone} />
                                        <InfoRow icon={MapPin} label="Adresa" value={businessAddress} />
                                        {(businessCity) && <InfoRow icon={MapPin} label="Qyteti" value={businessCity} />}
                                        <InfoRow icon={Globe} label="Website" value={businessWebsite} isLink={true} />
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-3 p-8 sm:p-10 flex flex-col justify-center">
                                {sent ? (
                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col items-center justify-center text-center py-12">
                                        <div className="w-16 h-16 bg-success-start/20 rounded-full flex items-center justify-center mb-4 text-success-start border border-success-start/30"><ShieldCheck size={32} /></div>
                                        <h4 className="text-xl font-bold text-text-primary mb-2">Mesazhi u dërgua me sukses!</h4>
                                        <p className="text-text-secondary">Faleminderit që na kontaktuat.</p>
                                    </motion.div>
                                ) : (
                                    <form onSubmit={handleSendMessage} className="space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div className="relative group"><User className="absolute left-3.5 top-3.5 text-text-muted w-4 h-4 group-focus-within:text-primary-start transition-colors" /><input type="text" placeholder="Emri" required value={formState.firstName} onChange={e => setFormState({...formState, firstName: e.target.value})} className="glass-input w-full pl-10 border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all" /></div>
                                            <div className="relative group"><User className="absolute left-3.5 top-3.5 text-text-muted w-4 h-4 group-focus-within:text-primary-start transition-colors" /><input type="text" placeholder="Mbiemri" required value={formState.lastName} onChange={e => setFormState({...formState, lastName: e.target.value})} className="glass-input w-full pl-10 border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all" /></div>
                                        </div>
                                        <div className="relative group"><Mail className="absolute left-3.5 top-3.5 text-text-muted w-4 h-4 group-focus-within:text-primary-start transition-colors" /><input type="email" placeholder="Email" required value={formState.email} onChange={e => setFormState({...formState, email: e.target.value})} className="glass-input w-full pl-10 border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all" /></div>
                                        <div className="relative group"><Phone className="absolute left-3.5 top-3.5 text-text-muted w-4 h-4 group-focus-within:text-primary-start transition-colors" /><input type="tel" placeholder="Telefoni (Opsional)" value={formState.phone} onChange={e => setFormState({...formState, phone: e.target.value})} className="glass-input w-full pl-10 border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all" /></div>
                                        <div className="relative group"><MessageSquare className="absolute left-3.5 top-3.5 text-text-muted w-4 h-4 group-focus-within:text-primary-start transition-colors" /><textarea placeholder="Mesazhi juaj..." rows={4} required value={formState.message} onChange={e => setFormState({...formState, message: e.target.value})} className="glass-input w-full pl-10 resize-none border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all" /></div>
                                        <div className="pt-2"><button type="submit" disabled={sending} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 rounded-xl py-4 hover-lift shadow-sm">{sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} Dërgo Mesazhin</button></div>
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