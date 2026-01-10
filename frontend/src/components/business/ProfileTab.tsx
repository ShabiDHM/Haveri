// FILE: src/components/business/ProfileTab.tsx
// PHOENIX PROTOCOL - PROFILE TAB V19.4 (LIVE QUOTA SYSTEM)
// 1. INTEGRATION: Replaced mock data with 'apiService.getTeamMembers()' & 'apiService.removeTeamMember()'.
// 2. FEATURE: Added dynamic Plan Limit indicator (e.g. "STARTUP: 2/5").
// 3. UI: The Invite button is disabled if the plan limit is reached.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
    Building2, Mail, Phone, Palette, Save, Upload, Loader2, Camera, MapPin, Globe, CreditCard,
    TrendingUp, Calculator, Coins, Users, UserPlus, Trash2, Shield, Crown
} from 'lucide-react';
import { apiService, API_V1_URL } from '../../services/api';
import { BusinessProfile, BusinessProfileUpdate, InviteUserRequest, User } from '../../data/types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_COLOR = '#3b82f6';

// PHOENIX: Plan Limits Configuration (Must match Backend)
const PLAN_LIMITS: Record<string, number> = {
    "SOLO": 1,
    "STARTUP": 5,
    "GROWTH": 10,
    "ENTERPRISE": 50
};

const SectionHeader = ({ icon, title }: { icon: React.ReactNode, title: string }) => (
    <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
        {icon}
        {title}
    </h3>
);

const FormField = ({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="group">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</label>
        <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors">
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

    // Team State
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviting, setInviting] = useState(false);
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [teamLoading, setTeamLoading] = useState(false);

    // Calculated Plan Info
    const currentPlan = user?.plan_tier || "SOLO";
    const maxUsers = PLAN_LIMITS[currentPlan] || 1;
    const currentUsage = teamMembers.length;
    const isPlanFull = currentUsage >= maxUsers;

    const [formData, setFormData] = useState<BusinessProfileUpdate>({
        firm_name: '', email_public: '', phone: '', address: '', city: '', website: '', tax_id: '', branding_color: DEFAULT_COLOR,
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
                    branding_color: data.branding_color || DEFAULT_COLOR,
                    vat_rate: data.vat_rate ?? 18,
                    target_margin: data.target_margin ?? 30,
                    currency: data.currency || 'EUR'
                });
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        fetchProfile();
        fetchTeam(); // Fetch team on mount
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
                    if (!url.startsWith('http')) setLogoSrc(`${cleanBase}/${cleanPath}`);
                    else setLogoSrc(url);
                })
                .finally(() => setLogoLoading(false));
        }
    }, [profile?.logo_url]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const cleanData: BusinessProfileUpdate = { ...formData };
            Object.keys(cleanData).forEach(key => {
                const k = key as keyof BusinessProfileUpdate;
                if (cleanData[k] === '' && k !== 'vat_rate' && k !== 'target_margin') {
                    cleanData[k] = undefined;
                }
            });
            
            const updatedProfile = await apiService.updateBusinessProfile(cleanData);
            setProfile(updatedProfile);
            alert(t('settings.successMessage'));
        } catch { 
            alert(t('error.generic')); 
        } finally { 
            await refreshBusinessProfile();
            setSaving(false); 
        }
    };
    
    const handleColorSave = async () => {
        setSaving(true);
        try {
            const updatedProfile = await apiService.updateBusinessProfile({ branding_color: formData.branding_color });
            setProfile(updatedProfile);
            alert(t('settings.successMessage'));
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
        setSaving(true);
        try {
            const p = await apiService.uploadBusinessLogo(f);
            setProfile(p);
        } catch { 
            alert(t('business.logoUploadFailed')); 
        } finally { 
            await refreshBusinessProfile();
            setSaving(false); 
        }
    };

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;
        
        // Frontend Pre-Check
        if (isPlanFull) {
            alert(`Ju keni arritur limitin e planit tuaj (${maxUsers} përdorues). Ju lutem bëni upgrade.`);
            return;
        }

        setInviting(true);
        try {
            const inviteRequest: InviteUserRequest = {
                email: inviteEmail,
                role: 'MEMBER'
            };
            
            await apiService.inviteUser(inviteRequest);
            alert(`Ftesa u dërgua me sukses tek ${inviteEmail}`);
            setInviteEmail('');
            fetchTeam(); // Refresh list
        } catch (err: any) {
            // Handle Backend Quota Error specifically
            if (err.response && err.response.status === 403) {
                alert("Limiti i planit u arrit! Ju lutem kontaktoni suportin për të rritur paketën.");
            } else {
                alert("Dështoi dërgimi i ftesës. Sigurohuni që email është i saktë.");
            }
        } finally {
            setInviting(false);
        }
    };

    const handleRemoveMember = async (id: string) => {
        if (window.confirm("A jeni i sigurt që doni ta largoni këtë anëtar?")) {
            try {
                await apiService.removeTeamMember(id);
                fetchTeam(); // Refresh list
            } catch {
                alert("Dështoi largimi i anëtarit.");
            }
        }
    };

    if (loading) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-blue-500" /></div>;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10">
            <div className="space-y-8">
                {/* LOGO CARD */}
                <div className="bg-gray-900/60 border border-white/10 rounded-3xl p-6 flex flex-col items-center shadow-2xl relative overflow-hidden group backdrop-blur-md">
                    <h3 className="text-white font-bold mb-6 self-start text-lg">{t('business.logoIdentity')}</h3>
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className={`w-40 h-40 rounded-full overflow-hidden flex items-center justify-center border-4 transition-all shadow-2xl ${logoSrc ? 'border-white/10' : 'border-dashed border-gray-700 hover:border-blue-500'}`}>
                            {logoLoading ? <Loader2 className="w-10 h-10 animate-spin text-blue-500" /> : logoSrc ? <img src={logoSrc} alt="Logo" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" onError={() => setLogoSrc(null)} /> : <div className="text-center group-hover:scale-110 transition-transform"><Upload className="w-10 h-10 text-gray-600 mx-auto mb-2" /><span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('business.upload')}</span></div>}
                        </div>
                        <div className="absolute inset-0 rounded-full bg-black/70 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"><Camera className="w-10 h-10 text-white drop-shadow-lg" /></div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                </div>

                {/* BRANDING CARD */}
                <div className="bg-gray-900/60 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
                    <SectionHeader icon={<Palette className="w-5 h-5 text-purple-400" />} title={t('business.branding')} />
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative overflow-hidden w-16 h-16 rounded-2xl border-2 border-white/10 shadow-inner"><input type="color" value={formData.branding_color || DEFAULT_COLOR} onChange={(e) => setFormData({ ...formData, branding_color: e.target.value })} className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer" /></div>
                        <div className="flex-1">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-lg">#</span>
                                <input type="text" value={(formData.branding_color || DEFAULT_COLOR).replace('#', '')} onChange={(e) => setFormData({ ...formData, branding_color: `#${e.target.value}` })} className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white font-mono uppercase focus:border-blue-500/50 outline-none transition-all text-base" />
                            </div>
                        </div>
                    </div>
                    <button type="button" onClick={handleColorSave} disabled={saving} className="w-full py-3 rounded-xl text-white font-bold text-sm shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: formData.branding_color || DEFAULT_COLOR }}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {t('business.saveColor')}
                    </button>
                </div>
            </div>

            <div className="md:col-span-2 space-y-8">
                {/* FORM CARD */}
                <form onSubmit={handleProfileSubmit} className="bg-gray-900/60 border border-white/10 rounded-3xl p-6 space-y-8 shadow-2xl relative overflow-hidden flex flex-col backdrop-blur-md">
                    {/* SECTION 1: IDENTITY */}
                    <div>
                        <SectionHeader icon={<Building2 className="w-6 h-6 text-blue-400" />} title={t('business.firmData')} />
                        <div className="space-y-6">
                            <FormField label={t('business.businessName', 'BUSINESS NAME')} icon={<Building2 />}>
                                <input type="text" name="firm_name" value={formData.firm_name} onChange={(e) => setFormData({ ...formData, firm_name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all text-sm placeholder:text-gray-600" placeholder={t('business.firmNamePlaceholder')} />
                            </FormField>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <FormField label={t('business.publicEmail')} icon={<Mail />}>
                                    <input type="email" name="email_public" value={formData.email_public} onChange={(e) => setFormData({ ...formData, email_public: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all text-sm" />
                                </FormField>
                                <FormField label={t('business.phone')} icon={<Phone />}>
                                    <input type="text" name="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all text-sm" />
                                </FormField>
                            </div>
                            
                            <FormField label={t('business.address')} icon={<MapPin />}>
                                <input type="text" name="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all text-sm" />
                            </FormField>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <FormField label={t('business.city')} icon={<span />}>
                                    <input type="text" name="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all text-sm" />
                                </FormField>
                                <FormField label={t('business.website')} icon={<Globe />}>
                                    <input type="text" name="website" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all text-sm" />
                                </FormField>
                            </div>
                            
                            <FormField label={t('business.taxId')} icon={<CreditCard />}>
                                <input type="text" name="tax_id" value={formData.tax_id} onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all text-sm" />
                            </FormField>
                        </div>
                    </div>

                    {/* SECTION 2: FISCAL CONFIGURATION */}
                    <div className="pt-8 border-t border-white/10">
                        <SectionHeader icon={<Calculator className="w-5 h-5 text-amber-400" />} title="Konfigurimi Fiskal & Inteligjenca" />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <FormField label="Norma e TVSH (%)" icon={<span className="font-bold text-gray-500">%</span>}>
                                <input type="number" value={formData.vat_rate} onChange={(e) => setFormData({...formData, vat_rate: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-amber-500/50 outline-none transition-all" />
                            </FormField>
                            <FormField label="Marzhi i Dëshiruar (%)" icon={<TrendingUp />}>
                                <input type="number" value={formData.target_margin} onChange={(e) => setFormData({...formData, target_margin: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-emerald-500/50 outline-none transition-all" />
                            </FormField>
                            <FormField label="Monedha" icon={<Coins />}>
                                <select value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all appearance-none cursor-pointer">
                                    <option value="EUR">Euro (€)</option>
                                    <option value="LEK">Lek (ALL)</option>
                                    <option value="USD">Dollar ($)</option>
                                </select>
                            </FormField>
                        </div>
                    </div>
                    
                    <div className="pt-4 flex justify-end">
                        <button type="submit" disabled={saving} className="flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-blue-600/30 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 text-base w-full sm:w-auto justify-center">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {t('general.save')}
                        </button>
                    </div>
                </form>

                {/* PHOENIX: TEAM MANAGEMENT CARD (LIVE) */}
                {(!user?.organization_role || user?.organization_role === 'OWNER') && (
                    <div className="bg-gray-900/60 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-emerald-700"></div>
                        
                        <div className="flex justify-between items-start mb-6">
                            <SectionHeader icon={<Users className="w-6 h-6 text-emerald-400" />} title="Menaxhimi i Ekipit" />
                            
                            {/* QUOTA INDICATOR */}
                            <div className="flex flex-col items-end">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isPlanFull ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                                    <Crown size={14} />
                                    <span className="text-xs font-bold uppercase tracking-wider">{currentPlan}</span>
                                </div>
                                <span className="text-[10px] text-gray-500 mt-1 font-mono uppercase tracking-widest">
                                    {currentUsage} / {maxUsers} Përdorues
                                </span>
                            </div>
                        </div>

                        <p className="text-gray-400 text-sm mb-6">Ftoni anëtarë të ri në ekipin tuaj për të bashkëpunuar në të njëjtin panel.</p>
                        
                        {/* INVITE FORM */}
                        <form onSubmit={handleInviteUser} className="flex flex-col sm:flex-row gap-4 items-end mb-8 border-b border-white/10 pb-8">
                            <div className="w-full flex-1">
                                <FormField label="Email i Bashkëpunëtorit" icon={<Mail />}>
                                    <input 
                                        type="email" 
                                        value={inviteEmail} 
                                        onChange={(e) => setInviteEmail(e.target.value)} 
                                        placeholder="shembull@kompania.com"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-emerald-500/50 outline-none transition-all text-sm disabled:opacity-50" 
                                        required
                                        disabled={isPlanFull}
                                    />
                                </FormField>
                            </div>
                            <button 
                                type="submit" 
                                disabled={inviting || !inviteEmail || isPlanFull}
                                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {inviting ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                                {isPlanFull ? "Limiti u Arrit" : "Dërgo Ftesën"}
                            </button>
                        </form>

                        {/* LIVE MEMBER LIST */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Anëtarët e Ekipit</h4>
                            {teamLoading ? (
                                <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin text-gray-500 mx-auto" /></div>
                            ) : (
                                <div className="space-y-3">
                                    {teamMembers.map(member => (
                                        <div key={member.id} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 hover:bg-black/30 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30 font-bold">
                                                    {member.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium text-sm">{member.email}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${member.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                            {member.status || 'Active'}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 font-mono">
                                                            {member.organization_role || 'MEMBER'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {member.organization_role !== 'OWNER' && (
                                                <button 
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                    title="Largo Anëtarin"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                            {member.organization_role === 'OWNER' && (
                                                <div className="p-2 text-emerald-500/50" title="Pronari">
                                                    <Shield size={18} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};