// FILE: src/components/business/ProfileTab.tsx
// PHOENIX PROTOCOL - PROFILE TAB V20.0 (PROFESSIONAL REORG)
// 1. REMOVED: Irritating Branding row and color picker.
// 2. REORG: Implemented a streamlined, professional two-column business layout.
// 3. INTEGRITY: Preserved all Team Management and Fiscal configuration logic.
// 4. STATUS: UI optimized for Professional Business users.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
    Building2, Mail, Phone, Save, Upload, Loader2, Camera, MapPin, Globe, CreditCard,
    TrendingUp, Calculator, Coins, Users, UserPlus, Trash2, Shield, Crown
} from 'lucide-react';
import { apiService, API_V1_URL } from '../../services/api';
import { BusinessProfile, BusinessProfileUpdate, User } from '../../data/types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

const PLAN_LIMITS: Record<string, number> = {
    "SOLO": 1, "STARTUP": 5, "GROWTH": 10, "ENTERPRISE": 50
};

const SectionHeader = ({ icon, title, subtitle }: { icon: React.ReactNode, title: string, subtitle?: string }) => (
    <div className="mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-3">
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">{icon}</span>
            {title}
        </h3>
        {subtitle && <p className="text-gray-500 text-xs mt-1 ml-11 font-medium">{subtitle}</p>}
    </div>
);

const FormField = ({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="group">
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.1em] mb-2 ml-1">{label}</label>
        <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors">
                {icon}
            </span>
            {children}
        </div>
    </div>
);

export const ProfileTab: React.FC = () => {
    const { t } = useTranslation();
    const { refreshBusinessProfile, user } = useAuth();
    const [profile, setProfile] = useState<BusinessProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logoSrc, setLogoSrc] = useState<string | null>(null);
    const [logoLoading, setLogoLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviting, setInviting] = useState(false);
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [teamLoading, setTeamLoading] = useState(false);

    const currentPlan = user?.plan_tier || "SOLO";
    const maxUsers = PLAN_LIMITS[currentPlan] || 1;
    const isPlanFull = teamMembers.length >= maxUsers;

    const [formData, setFormData] = useState<BusinessProfileUpdate>({
        firm_name: '', email_public: '', phone: '', address: '', city: '', website: '', tax_id: '',
        vat_rate: 18, target_margin: 30, currency: 'EUR'
    });

    const fetchTeam = useCallback(async () => {
        if (user?.organization_role !== 'OWNER') return;
        setTeamLoading(true);
        try {
            const members = await apiService.getTeamMembers();
            setTeamMembers(members);
        } catch (error) {
            console.error("Failed to fetch team", error);
        } finally {
            setTeamLoading(false);
        }
    }, [user?.organization_role]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await apiService.getBusinessProfile();
                setProfile(data);
                setFormData({
                    firm_name: data.firm_name || '', 
                    email_public: data.email_public || '', 
                    phone: data.phone || '',
                    address: data.address || '', 
                    city: data.city || '', 
                    website: data.website || '',
                    tax_id: data.tax_id || '', 
                    vat_rate: data.vat_rate ?? 18,
                    target_margin: data.target_margin ?? 30,
                    currency: data.currency || 'EUR'
                });
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        fetchProfile();
        fetchTeam();
    }, [fetchTeam]);

    useEffect(() => {
        const url = profile?.logo_url;
        if (url) {
            if (url.startsWith('blob:') || url.startsWith('data:')) { setLogoSrc(url); return; }
            setLogoLoading(true);
            apiService.fetchImageBlob(url)
                .then((blob: Blob) => setLogoSrc(URL.createObjectURL(blob)))
                .catch(() => {
                    const cleanBase = API_V1_URL.endsWith('/') ? API_V1_URL.slice(0, -1) : API_V1_URL;
                    const cleanPath = url.startsWith('/') ? url.slice(1) : url;
                    setLogoSrc(`${cleanBase}/${cleanPath}`);
                })
                .finally(() => setLogoLoading(false));
        }
    }, [profile?.logo_url]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const updatedProfile = await apiService.updateBusinessProfile(formData);
            setProfile(updatedProfile);
            alert(t('saveSuccess', 'U ruajt me sukses!'));
        } catch { 
            alert(t('error.generic')); 
        } finally { 
            await refreshBusinessProfile();
            setSaving(false); 
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setLogoLoading(true);
        try {
            const p = await apiService.uploadBusinessLogo(f);
            setProfile(p);
        } catch { 
            alert(t('business.logoUploadFailed')); 
        } finally { 
            await refreshBusinessProfile();
            setLogoLoading(false); 
        }
    };

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail || isPlanFull) return;
        setInviting(true);
        try {
            await apiService.inviteUser({ email: inviteEmail, role: 'MEMBER' });
            setInviteEmail('');
            fetchTeam();
        } catch (err: any) {
            alert(err.response?.status === 403 ? "Limiti i planit u arrit!" : "Dështoi dërgimi i ftesës.");
        } finally { setInviting(false); }
    };

    const handleRemoveMember = async (memberId: string) => {
        try {
            await apiService.removeTeamMember(memberId);
            fetchTeam();
        } catch (error) {
            alert("Dështoi heqja e anëtarit.");
            console.error("Failed to remove member", error);
        }
    };

    if (loading) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-blue-500" /></div>;

    const inputClasses = "w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all text-sm placeholder:text-gray-700";

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-8 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* LEFT SIDEBAR: LOGO & STATUS */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-gray-900/60 border border-white/10 rounded-3xl p-8 flex flex-col items-center shadow-2xl backdrop-blur-md">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-32 h-32 rounded-3xl overflow-hidden flex items-center justify-center border-2 border-white/5 bg-black/40 shadow-inner group-hover:border-blue-500/50 transition-all duration-500">
                                {logoLoading ? <Loader2 className="animate-spin text-blue-500" /> : logoSrc ? <img src={logoSrc} className="w-full h-full object-contain p-2" onError={() => setLogoSrc(null)} alt="Business Logo" /> : <Upload className="text-gray-600" />}
                            </div>
                            <div className="absolute -bottom-2 -right-2 p-2 bg-blue-600 rounded-xl text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={16} /></div>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                        <div className="text-center mt-6">
                            <h2 className="text-white font-black text-xl tracking-tight">{profile?.firm_name || t('business.businessName')}</h2>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">{t('business.profile')}</p>
                        </div>
                    </div>

                    <div className="bg-gray-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Plani Aktual</span>
                            <div className="px-2 py-1 bg-blue-500/20 rounded border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-tighter flex items-center gap-1">
                                <Crown size={10} /> {currentPlan}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${(teamMembers.length / maxUsers) * 100}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500 font-mono">
                                <span>Kapaciteti</span>
                                <span>{teamMembers.length} / {maxUsers}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAIN FORM AREA */}
                <div className="lg:col-span-8">
                    <form onSubmit={handleProfileSubmit} className="bg-gray-900/60 border border-white/10 rounded-3xl p-8 space-y-10 shadow-2xl backdrop-blur-md">
                        {/* SECTION: GENERAL DATA */}
                        <div>
                            <SectionHeader icon={<Building2 size={18} />} title="Identiteti i Biznesit" subtitle="Informacionet kryesore për faturim dhe raporte." />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <FormField label="Emri i Biznesit" icon={<Building2 />}>
                                        <input type="text" value={formData.firm_name} onChange={(e) => setFormData({...formData, firm_name: e.target.value})} className={inputClasses} placeholder="Shënoni emrin zyrtar..." />
                                    </FormField>
                                </div>
                                <FormField label="Email Publik" icon={<Mail />}>
                                    <input type="email" value={formData.email_public} onChange={(e) => setFormData({...formData, email_public: e.target.value})} className={inputClasses} placeholder="email@biznesi.com" />
                                </FormField>
                                <FormField label="Numri i Telefonit" icon={<Phone />}>
                                    <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className={inputClasses} placeholder="+383..." />
                                </FormField>
                                <div className="md:col-span-2">
                                    <FormField label="Adresa" icon={<MapPin />}>
                                        <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className={inputClasses} placeholder="Rr. Kryesore, Nr. 1" />
                                    </FormField>
                                </div>
                                <FormField label="Qyteti" icon={<MapPin />}>
                                    <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className={inputClasses} />
                                </FormField>
                                <FormField label="Website" icon={<Globe />}>
                                    <input type="text" value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})} className={inputClasses} placeholder="www.web.com" />
                                </FormField>
                                <div className="md:col-span-2">
                                    <FormField label="Numri Fiskal (NUI)" icon={<CreditCard />}>
                                        <input type="text" value={formData.tax_id} onChange={(e) => setFormData({...formData, tax_id: e.target.value})} className={inputClasses} />
                                    </FormField>
                                </div>
                            </div>
                        </div>

                        {/* SECTION: FISCAL */}
                        <div className="pt-8 border-t border-white/5">
                            <SectionHeader icon={<Calculator size={18} />} title="Parametrat Fiskal" subtitle="Konfigurimet automatike për kalkulimin e TVSH-së dhe fitimit." />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormField label="Norma TVSH (%)" icon={<span className="text-[10px] font-black">%</span>}>
                                    <input type="number" value={formData.vat_rate} onChange={(e) => setFormData({...formData, vat_rate: parseFloat(e.target.value)})} className={inputClasses} />
                                </FormField>
                                <FormField label="Marzhi i Synuar (%)" icon={<TrendingUp size={16}/>}>
                                    <input type="number" value={formData.target_margin} onChange={(e) => setFormData({...formData, target_margin: parseFloat(e.target.value)})} className={inputClasses} />
                                </FormField>
                                <FormField label="Monedha" icon={<Coins size={16}/>}>
                                    <select value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} className={`${inputClasses} appearance-none cursor-pointer`}>
                                        <option value="EUR">Euro (€)</option>
                                        <option value="LEK">Lek (ALL)</option>
                                        <option value="USD">Dollar ($)</option>
                                    </select>
                                </FormField>
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end">
                            <button type="submit" disabled={saving} className="flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                Ruaj Ndryshimet
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* TEAM MANAGEMENT CARD */}
            {(!user?.organization_role || user?.organization_role === 'OWNER') && (
                <div className="bg-gray-900/60 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-md overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500" />
                    <div className="flex flex-col md:flex-row justify-between gap-8">
                        <div className="max-w-sm">
                            <SectionHeader icon={<Users size={18} />} title="Ekipi i Bashkëpunimit" />
                            <p className="text-gray-400 text-sm leading-relaxed mb-6">Ftoni stafin ose partnerët tuaj. Ata do të kenë akses të plotë në këtë panel biznesi.</p>
                            
                            <form onSubmit={handleInviteUser} className="space-y-4">
                                <FormField label="Email i Kolegut" icon={<Mail />}>
                                    <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} disabled={isPlanFull} className={inputClasses} placeholder="emri@kompania.com" />
                                </FormField>
                                <button type="submit" disabled={inviting || isPlanFull} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                    {inviting ? <Loader2 className="animate-spin" /> : <UserPlus size={18}/>}
                                    {isPlanFull ? "Limiti u Arrit" : "Dërgo Ftesën"}
                                </button>
                            </form>
                        </div>

                        <div className="flex-1 space-y-3">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Anëtarët Aktivë</h4>
                            {teamLoading ? <Loader2 className="animate-spin mx-auto text-gray-700" /> : teamMembers.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 group hover:border-white/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-black border border-blue-500/20 uppercase">{member.username.charAt(0)}</div>
                                        <div>
                                            <p className="text-white text-sm font-bold">{member.email}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${member.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{member.status || 'Active'}</span>
                                                <span className="text-[9px] text-gray-600 font-mono uppercase">{member.organization_role}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {member.organization_role !== 'OWNER' && (
                                        <button onClick={() => handleRemoveMember(member.id)} className="p-2 text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                    )}
                                    {member.organization_role === 'OWNER' && <Shield size={16} className="text-blue-500/30 mr-2" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};