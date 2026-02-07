// FILE: src/components/business/ProfileTab.tsx
// PHOENIX PROTOCOL - PROFILE TAB V21.0 (SYMMETRY & ALIGNMENT FIX)
// 1. RE-LAYOUT: Unified grid system to ensure professional horizontal and vertical alignment.
// 2. DESIGN: Standardized card geometry and consistent spacing.
// 3. LOGIC: Maintained all high-integrity business and team logic.
// 4. STATUS: Ready for professional deployment.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
    Building2, Mail, Phone, Save, Upload, Loader2, Camera, MapPin, Globe, CreditCard,
    TrendingUp, Coins, Users, UserPlus, Trash2, Crown
} from 'lucide-react';
import { apiService, API_V1_URL } from '../../services/api';
import { BusinessProfile, BusinessProfileUpdate, User } from '../../data/types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

const PLAN_LIMITS: Record<string, number> = {
    "SOLO": 1, "STARTUP": 5, "GROWTH": 10, "ENTERPRISE": 50
};

const SectionHeader = ({ icon, title, subtitle }: { icon: React.ReactNode, title: string, subtitle?: string }) => (
    <div className="mb-8">
        <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
                {icon}
            </div>
            <div>
                <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
                {subtitle && <p className="text-gray-500 text-xs mt-0.5 font-medium">{subtitle}</p>}
            </div>
        </div>
    </div>
);

const FormField = ({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="space-y-2">
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

    const inputClasses = "w-full bg-black/30 border border-white/5 rounded-xl pl-12 pr-4 py-3.5 text-white focus:border-blue-500/50 focus:bg-black/50 outline-none transition-all text-sm";

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6 pb-20">
            
            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* COLUMN 1: SIDEBAR (Identity & Plan) */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-gray-900/60 border border-white/10 rounded-[2rem] p-8 flex flex-col items-center text-center shadow-xl backdrop-blur-md h-fit">
                        <div className="relative group mb-6" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden flex items-center justify-center border-2 border-white/5 bg-black/40 shadow-2xl group-hover:border-blue-500/50 transition-all duration-500">
                                {logoLoading ? <Loader2 className="animate-spin text-blue-500" /> : logoSrc ? <img src={logoSrc} className="w-full h-full object-contain p-4" alt="Logo" /> : <Upload className="text-gray-600" />}
                            </div>
                            <div className="absolute inset-0 rounded-[2.5rem] bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera className="text-white" /></div>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                        <h2 className="text-2xl font-black text-white tracking-tight mb-1">{profile?.firm_name || "Kompania Juaj"}</h2>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                            {t('business.profile')}
                        </div>
                    </div>

                    <div className="bg-gray-900/60 border border-white/10 rounded-[2rem] p-8 shadow-xl backdrop-blur-md">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Abonimi</h4>
                            <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs"><Crown size={14} /> {currentPlan}</div>
                        </div>
                        <div className="space-y-4">
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500" style={{ width: `${(teamMembers.length / maxUsers) * 100}%` }} />
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black text-gray-500 uppercase font-mono">
                                <span>Përdoruesit</span>
                                <span className="text-white">{teamMembers.length} / {maxUsers}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMN 2: MAIN FORM */}
                <div className="lg:col-span-8">
                    <form onSubmit={handleProfileSubmit} className="bg-gray-900/60 border border-white/10 rounded-[2rem] p-10 shadow-xl backdrop-blur-md h-full flex flex-col">
                        <SectionHeader icon={<Building2 size={20} />} title="Konfigurimi i Biznesit" subtitle="Menaxhoni të dhënat ligjore dhe fiskale të hapësirës tuaj." />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                            <div className="md:col-span-2">
                                <FormField label="Emri Zyrtar i Biznesit" icon={<Building2 size={16} />}>
                                    <input type="text" value={formData.firm_name} onChange={(e) => setFormData({...formData, firm_name: e.target.value})} className={inputClasses} placeholder="Shënoni emrin..." />
                                </FormField>
                            </div>
                            
                            <FormField label="Email i Biznesit" icon={<Mail size={16} />}>
                                <input type="email" value={formData.email_public} onChange={(e) => setFormData({...formData, email_public: e.target.value})} className={inputClasses} />
                            </FormField>
                            
                            <FormField label="Telefon" icon={<Phone size={16} />}>
                                <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className={inputClasses} />
                            </FormField>

                            <div className="md:col-span-2">
                                <FormField label="Adresa Fizike" icon={<MapPin size={16} />}>
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

                            {/* FISCAL MINI-SECTION */}
                            <div className="md:col-span-2 grid grid-cols-3 gap-4 pt-6 border-t border-white/5 mt-4">
                                <FormField label="TVSH %" icon={<span className="text-[10px]">%</span>}>
                                    <input type="number" value={formData.vat_rate} onChange={(e) => setFormData({...formData, vat_rate: parseFloat(e.target.value)})} className={inputClasses} />
                                </FormField>
                                <FormField label="Margjina %" icon={<TrendingUp size={14} />}>
                                    <input type="number" value={formData.target_margin} onChange={(e) => setFormData({...formData, target_margin: parseFloat(e.target.value)})} className={inputClasses} />
                                </FormField>
                                <FormField label="Monedha" icon={<Coins size={14} />}>
                                    <select value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} className={`${inputClasses} appearance-none cursor-pointer`}>
                                        <option value="EUR">Euro (€)</option>
                                        <option value="LEK">Lek (ALL)</option>
                                        <option value="USD">Dollar ($)</option>
                                    </select>
                                </FormField>
                            </div>
                        </div>

                        <div className="mt-12 flex justify-end">
                            <button type="submit" disabled={saving} className="flex items-center gap-3 px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50">
                                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                RUHAJ NDRYSHIMET
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* TEAM SECTION: FULL WIDTH ALIGNED */}
            {user?.organization_role === 'OWNER' && (
                <div className="bg-gray-900/60 border border-white/10 rounded-[2rem] p-10 shadow-xl backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-emerald-500 opacity-50" />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <div>
                            <SectionHeader icon={<Users size={20} />} title="Bashkëpunëtorët" subtitle="Ftoni ekipin tuaj për të menaxhuar së bashku." />
                            <p className="text-gray-400 text-sm leading-relaxed mb-8">Anëtarët e ftuar do të kenë qasje në financat, stokun dhe arkivën e këtij biznesi.</p>
                            
                            <form onSubmit={handleInviteUser} className="space-y-4 max-w-md">
                                <FormField label="Email i Anëtarit të ri" icon={<Mail size={16} />}>
                                    <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} disabled={isPlanFull} className={inputClasses} placeholder="email@ekipi.com" />
                                </FormField>
                                <button type="submit" disabled={inviting || isPlanFull} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                                    {inviting ? <Loader2 className="animate-spin" /> : <UserPlus size={18}/>}
                                    {isPlanFull ? "LIMITI U ARRIT" : "DËRGO FTESËN"}
                                </button>
                            </form>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Ekipi Aktual</h4>
                            {teamLoading ? <Loader2 className="animate-spin mx-auto text-gray-700" /> : (
                                <div className="grid gap-3">
                                    {teamMembers.map(member => (
                                        <div key={member.id} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 group hover:border-white/10 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-black border border-blue-500/20">{member.username.charAt(0).toUpperCase()}</div>
                                                <div>
                                                    <p className="text-white text-sm font-bold">{member.email}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${member.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{member.status}</span>
                                                        <span className="text-[9px] text-gray-600 font-mono uppercase font-bold">{member.organization_role}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {member.organization_role !== 'OWNER' && (
                                                <button onClick={() => handleRemoveMember(member.id)} className="p-2 text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};