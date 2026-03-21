// FILE: src/components/business/ProfileTab.tsx
// PHOENIX PROTOCOL - PROFILE TAB V24.0 (DESIGN SYSTEM ALIGNMENT)
// 1. FIXED: Responsive grid for Fiscal parameters (1-col mobile, 3-col desktop).
// 2. FIXED: Scaled 'Save' button and inputs for professional mobile ergonomics.
// 3. UPDATED: Uses new design system CSS variables for light/dark theme compatibility.
// 4. STATUS: 100% Mobile & Desktop optimized.

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
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                {icon}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">{title}</h3>
        </div>
        {subtitle && <p className="text-text-muted text-[10px] sm:text-[11px] mt-1.5 ml-1 font-medium leading-relaxed">{subtitle}</p>}
    </div>
);

const FormField = ({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{label}</label>
        <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors">
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

    if (loading) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;

    const inputClasses = "glass-input w-full pl-11 text-sm";

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto px-2 sm:px-6 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* --- SIDEBAR --- */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-surface/60 border border-border-main rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 flex flex-col items-center text-center shadow-xl backdrop-blur-md">
                        <div className="relative group mb-6" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl overflow-hidden flex items-center justify-center border-2 border-border-main bg-surface shadow-xl group-hover:border-primary/50 transition-all duration-500">
                                {logoLoading ? <Loader2 className="animate-spin text-primary" /> : logoSrc ? <img src={logoSrc} className="w-full h-full object-contain p-3" alt="Logo" /> : <Upload className="text-text-muted" />}
                            </div>
                            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"><Camera className="text-inverse" size={20} /></div>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                        <h2 className="text-lg sm:text-xl font-black text-text-primary tracking-tight leading-tight px-2">{profile?.firm_name || "Kompania Juaj"}</h2>
                        <span className="text-text-muted text-[9px] font-black uppercase tracking-[0.2em] mt-2 block">{t('business.profile')}</span>
                    </div>

                    <div className="bg-surface/60 border border-border-main rounded-[1.5rem] sm:rounded-[2rem] p-6 shadow-xl backdrop-blur-md">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-text-muted text-[9px] font-black uppercase tracking-widest">Abonimi</h4>
                            <div className="px-2 py-0.5 bg-primary/10 rounded border border-primary/30 text-primary text-[9px] font-black uppercase flex items-center gap-1">
                                <Crown size={10} /> {currentPlan}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="h-1.5 w-full bg-border-main rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${(teamMembers.length / maxUsers) * 100}%` }} />
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-black text-text-muted uppercase font-mono">
                                <span>Bashkëpunëtorët</span>
                                <span className="text-text-primary">{teamMembers.length} / {maxUsers}</span>
                            </div>
                        </div>
                    </div>

                    {user?.organization_role === 'OWNER' && (
                        <div className="bg-surface/60 border border-border-main rounded-[1.5rem] sm:rounded-[2rem] p-6 shadow-xl backdrop-blur-md">
                            <SectionHeader icon={<Users size={16} />} title="Ekipi" />
                            <form onSubmit={handleInviteUser} className="mb-6">
                                <div className="relative group mb-3">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-success-start" />
                                    <input 
                                        type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} 
                                        disabled={isPlanFull} className="glass-input w-full pl-11 py-2.5 text-xs" 
                                        placeholder="email@ekipi.com" 
                                    />
                                </div>
                                <button type="submit" disabled={inviting || isPlanFull} className="w-full py-2.5 bg-success-start/10 hover:bg-success-start text-success-start hover:text-inverse border border-success-start/20 rounded-xl font-bold text-[10px] transition-all disabled:opacity-30">
                                    {inviting ? <Loader2 className="animate-spin inline mr-2" size={12} /> : <UserPlus className="inline mr-2" size={12}/>}
                                    {isPlanFull ? "LIMITI U ARRIT" : "FTO ANËTARIN"}
                                </button>
                            </form>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                {teamMembers.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-2.5 bg-surface rounded-xl border border-border-main group">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black border border-primary/20 uppercase shrink-0">{member.username.charAt(0)}</div>
                                            <div className="min-w-0">
                                                <p className="text-text-primary text-[10px] font-bold truncate">{member.email}</p>
                                            </div>
                                        </div>
                                        {member.organization_role !== 'OWNER' && (
                                            <button onClick={() => handleRemoveMember(member.id)} className="p-1 text-text-muted hover:text-danger transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- MAIN FORM --- */}
                <div className="lg:col-span-8">
                    <form onSubmit={handleProfileSubmit} className="bg-surface/60 border border-border-main rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-10 shadow-xl backdrop-blur-md">
                        <SectionHeader icon={<Building2 size={20} />} title="Konfigurimi i Biznesit" subtitle="Të dhënat kryesore të hapësirës tuaj." />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                            <div className="md:col-span-2">
                                <FormField label="Emri Zyrtar" icon={<Building2 size={16} />}>
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

                            {/* FISCAL - Optimized for Mobile Grid */}
                            <div className="md:col-span-2 pt-8 border-t border-border-main mt-4">
                                <SectionHeader icon={<Calculator size={18} />} title="Parametrat Fiskal" />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
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

                        <div className="mt-10 sm:mt-12 flex justify-end">
                            <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto flex items-center justify-center gap-3 px-8 sm:px-12 py-3.5 sm:py-4 tracking-widest text-[10px] sm:text-xs">
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