// FILE: src/components/business/ProfileTab.tsx
// PHOENIX PROTOCOL - PROFILE TAB V22.0 (TERMINAL SYMMETRY)
// 1. RE-LAYOUT: Moved Team Management to the left sidebar for vertical alignment.
// 2. DESIGN: Achieved industrial symmetry with a 4/8 column distribution.
// 3. STATUS: Final UI polish applied.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
    Building2, Mail, Phone, Save, Upload, Loader2, Camera, MapPin, Globe, CreditCard,
    TrendingUp, Calculator, Coins, Users, UserPlus, Trash2, Crown
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
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
                {icon}
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
        </div>
        {subtitle && <p className="text-gray-500 text-[11px] mt-1.5 ml-1 font-medium leading-relaxed">{subtitle}</p>}
    </div>
);

const FormField = ({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
        <div className="relative group">
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
    const [, setTeamLoading] = useState(false);

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
        } catch (error) { console.error(error); } finally { setTeamLoading(false); }
    }, [user?.organization_role]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await apiService.getBusinessProfile();
                setProfile(data);
                setFormData({
                    firm_name: data.firm_name || '', email_public: data.email_public || '', phone: data.phone || '',
                    address: data.address || '', city: data.city || '', website: data.website || '',
                    tax_id: data.tax_id || '', vat_rate: data.vat_rate ?? 18,
                    target_margin: data.target_margin ?? 30, currency: data.currency || 'EUR'
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
            await apiService.updateBusinessProfile(formData);
            alert(t('saveSuccess'));
        } catch { alert(t('error.generic')); } finally { 
            await refreshBusinessProfile();
            setSaving(false); 
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setLogoLoading(true);
        try {
            await apiService.uploadBusinessLogo(f);
        } catch { alert(t('business.logoUploadFailed')); } finally { 
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
        } catch (err: any) { alert("Ftesa dështoi."); } finally { setInviting(false); }
    };

    const handleRemoveMember = async (id: string) => {
        if (window.confirm("A jeni i sigurt?")) {
            try { await apiService.removeTeamMember(id); fetchTeam(); } catch { alert("Dështoi."); }
        }
    };

    if (loading) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-blue-500" /></div>;

    const inputClasses = "w-full bg-black/30 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-white focus:border-blue-500/50 focus:bg-black/50 outline-none transition-all text-sm";

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* --- LEFT COLUMN: MANAGEMENT --- */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* LOGO & IDENTITY */}
                    <div className="bg-gray-900/60 border border-white/10 rounded-[2rem] p-8 flex flex-col items-center text-center shadow-xl backdrop-blur-md">
                        <div className="relative group mb-6" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-28 h-28 rounded-3xl overflow-hidden flex items-center justify-center border-2 border-white/5 bg-black/40 shadow-2xl group-hover:border-blue-500/50 transition-all duration-500">
                                {logoLoading ? <Loader2 className="animate-spin text-blue-500" /> : logoSrc ? <img src={logoSrc} className="w-full h-full object-contain p-4" alt="Logo" /> : <Upload className="text-gray-600" />}
                            </div>
                            <div className="absolute inset-0 rounded-3xl bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"><Camera className="text-white" size={20} /></div>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                        <h2 className="text-xl font-black text-white tracking-tight leading-tight">{profile?.firm_name || "Kompania Juaj"}</h2>
                        <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2 block">{t('business.profile')}</span>
                    </div>

                    {/* SUBSCRIPTION STATUS */}
                    <div className="bg-gray-900/60 border border-white/10 rounded-[2rem] p-6 shadow-xl backdrop-blur-md">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Plani Aktual</h4>
                            <div className="px-2 py-1 bg-blue-500/10 rounded border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase flex items-center gap-1.5">
                                <Crown size={12} /> {currentPlan}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${(teamMembers.length / maxUsers) * 100}%` }} />
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black text-gray-500 uppercase font-mono">
                                <span>Ekipi</span>
                                <span className="text-white">{teamMembers.length} / {maxUsers}</span>
                            </div>
                        </div>
                    </div>

                    {/* TEAM MANAGEMENT (MOVED HERE FOR SYMMETRY) */}
                    {user?.organization_role === 'OWNER' && (
                        <div className="bg-gray-900/60 border border-white/10 rounded-[2rem] p-6 shadow-xl backdrop-blur-md">
                            <SectionHeader icon={<Users size={16} />} title="Bashkëpunëtorët" />
                            
                            <form onSubmit={handleInviteUser} className="mb-8">
                                <div className="relative group mb-3">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-emerald-400" />
                                    <input 
                                        type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} 
                                        disabled={isPlanFull} className="w-full bg-black/40 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50" 
                                        placeholder="email@ekipi.com" 
                                    />
                                </div>
                                <button type="submit" disabled={inviting || isPlanFull} className="w-full py-3 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-xl font-bold text-xs transition-all disabled:opacity-30">
                                    {inviting ? <Loader2 className="animate-spin inline mr-2" size={14} /> : <UserPlus className="inline mr-2" size={14}/>}
                                    {isPlanFull ? "LIMITI U ARRIT" : "FTO ANËTARIN"}
                                </button>
                            </form>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {teamMembers.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-black border border-white/5 uppercase">{member.username.charAt(0)}</div>
                                            <div className="min-w-0">
                                                <p className="text-white text-[11px] font-bold truncate">{member.email}</p>
                                                <span className="text-[9px] text-gray-500 font-mono uppercase">{member.organization_role}</span>
                                            </div>
                                        </div>
                                        {member.organization_role !== 'OWNER' && (
                                            <button onClick={() => handleRemoveMember(member.id)} className="p-1.5 text-gray-600 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- RIGHT COLUMN: DATA ENTRY --- */}
                <div className="lg:col-span-8">
                    <form onSubmit={handleProfileSubmit} className="bg-gray-900/60 border border-white/10 rounded-[2rem] p-10 shadow-xl backdrop-blur-md h-full">
                        <SectionHeader icon={<Building2 size={20} />} title="Konfigurimi i Biznesit" subtitle="Të dhënat kryesore të hapësirës tuaj të punës." />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="md:col-span-2">
                                <FormField label="Emri Zyrtar i Biznesit" icon={<Building2 size={16} />}>
                                    <input type="text" value={formData.firm_name} onChange={(e) => setFormData({...formData, firm_name: e.target.value})} className={inputClasses} placeholder="Shënoni emrin..." />
                                </FormField>
                            </div>
                            
                            <FormField label="Email Publik" icon={<Mail size={16} />}>
                                <input type="email" value={formData.email_public} onChange={(e) => setFormData({...formData, email_public: e.target.value})} className={inputClasses} />
                            </FormField>
                            
                            <FormField label="Telefon" icon={<Phone size={16} />}>
                                <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className={inputClasses} />
                            </FormField>

                            <div className="md:col-span-2">
                                <FormField label="Adresa" icon={<MapPin size={16} />}>
                                    <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className={inputClasses} />
                                </FormField>
                            </div>

                            <FormField label="Qyteti" icon={<MapPin size={16} />}>
                                <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className={inputClasses} />
                            </FormField>

                            <FormField label="Website" icon={<Globe size={16} />}>
                                <input type="text" value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})} className={inputClasses} />
                            </FormField>

                            <div className="md:col-span-2">
                                <FormField label="Numri Fiskal (NUI)" icon={<CreditCard size={16} />}>
                                    <input type="text" value={formData.tax_id} onChange={(e) => setFormData({...formData, tax_id: e.target.value})} className={inputClasses} />
                                </FormField>
                            </div>

                            <div className="md:col-span-2 pt-8 border-t border-white/5 mt-4">
                                <SectionHeader icon={<Calculator size={18} />} title="Parametrat Fiskal" />
                                <div className="grid grid-cols-3 gap-6">
                                    <FormField label="TVSH %" icon={<span className="text-[10px] font-black">%</span>}>
                                        <input type="number" value={formData.vat_rate} onChange={(e) => setFormData({...formData, vat_rate: parseFloat(e.target.value)})} className={inputClasses} />
                                    </FormField>
                                    <FormField label="Margjina %" icon={<TrendingUp size={16} />}>
                                        <input type="number" value={formData.target_margin} onChange={(e) => setFormData({...formData, target_margin: parseFloat(e.target.value)})} className={inputClasses} />
                                    </FormField>
                                    <FormField label="Monedha" icon={<Coins size={16} />}>
                                        <select value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} className={`${inputClasses} appearance-none cursor-pointer`}>
                                            <option value="EUR">Euro (€)</option>
                                            <option value="LEK">Lek (ALL)</option>
                                            <option value="USD">Dollar ($)</option>
                                        </select>
                                    </FormField>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 flex justify-end">
                            <button type="submit" disabled={saving} className="flex items-center gap-3 px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 tracking-widest text-xs">
                                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                RUHAJ NDRYSHIMET
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </motion.div>
    );
};