// FILE: src/components/business/ProfileTab.tsx
// PHOENIX PROTOCOL - PROFILE TAB V29.1 (EXECUTIVE DESIGN SYSTEM)
// Restored Camera and FormField usage to clear warnings.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
    Building2, Mail, Phone, Save, Upload, Loader2, Camera, MapPin, Globe, CreditCard,
    TrendingUp, Calculator, Coins, Users, UserPlus, Trash2, Crown, ArrowRight
} from 'lucide-react';
import { apiService, API_V1_URL } from '../../services/api';
import { BusinessProfile, BusinessProfileUpdate, User } from '../../data/types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Panel } from '../ui/Panel';
import { useNavigate } from 'react-router-dom';

const PLAN_LIMITS: Record<string, number> = {
    "SOLO": 1, "STARTUP": 5, "GROWTH": 10, "ENTERPRISE": 50
};

const SectionHeader = ({ icon, title, subtitle }: { icon: React.ReactNode, title: string, subtitle?: string }) => (
    <div className="mb-6">
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-start/10 text-primary-start border border-border-main">{icon}</div>
            <h3 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">{title}</h3>
        </div>
        {subtitle && <p className="text-xs font-black uppercase tracking-widest text-text-muted mt-1.5 ml-1">{subtitle}</p>}
    </div>
);

const FormField = ({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">{label}</label>
        <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary-start transition-colors">{icon}</span>
            {children}
        </div>
    </div>
);

export const ProfileTab: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
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
            await refreshBusinessProfile();
        } catch { alert(t('business.logoUploadFailed')); } finally { setLogoLoading(false); }
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

    if (loading) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-primary-start" /></div>;

    const inputClasses = "glass-input w-full bg-canvas border-border-main rounded-xl py-4 px-5 text-sm font-bold text-text-primary focus:border-primary-start placeholder:text-text-muted";

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="w-full max-w-5xl mx-auto space-y-6"
        >
            {/* Main form container – uses glass-panel with bg-surface */}
            <form onSubmit={handleProfileSubmit} className="glass-panel bg-surface border border-border-main rounded-3xl p-8 sm:p-10 shadow-sm relative overflow-hidden">
                
                {/* Executive Top Accent */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-start to-primary-hover" />

                {/* --- HEADER SECTION --- */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-6 border-b border-border-main/50 pb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 bg-primary-start/10 text-primary-start rounded-2xl border border-primary-start/20 shadow-inner">
                            <Building2 size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-text-primary tracking-tight uppercase">
                                {t('business.firmData', 'Të dhënat e Zyrës')}
                            </h3>
                            <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-1">
                                {t('business.firmDataSub', 'Konfigurimi i profilit të zyrës')}
                            </p>
                        </div>
                    </div>

                    {/* Logo Upload Section */}
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-20 h-20 rounded-full bg-canvas border border-border-main flex items-center justify-center overflow-hidden shadow-sm transition-all hover:border-primary-start/50 hover-lift">
                            {logoLoading ? <Loader2 className="animate-spin text-primary-start" /> : 
                             logoSrc ? <img src={logoSrc} className="w-full h-full object-contain p-2" /> : <Upload className="text-text-muted" />}
                        </div>
                        {/* Camera overlay – now used to silence the import warning */}
                        <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Camera size={20} className="text-white" />
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" />
                    </div>
                </div>

                {/* --- FORM FIELDS --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Firm Name */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 ml-1">
                            {t('business.firmNameLabel', 'Emri i Firmës / Zyrës')}
                        </label>
                        <input 
                            type="text" 
                            value={formData.firm_name} 
                            onChange={(e) => setFormData({...formData, firm_name: e.target.value})} 
                            className={inputClasses} 
                        />
                    </div>

                    {/* Email & Phone */}
                    <div>
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 ml-1">
                            {t('business.emailPublicLabel', 'Email Publik')}
                        </label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input 
                                type="email" 
                                value={formData.email_public} 
                                onChange={(e) => setFormData({...formData, email_public: e.target.value})} 
                                className={inputClasses + " pl-11"} 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 ml-1">
                            {t('business.phoneLabel', 'Telefoni')}
                        </label>
                        <div className="relative group">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input 
                                type="text" 
                                value={formData.phone} 
                                onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                                className={inputClasses + " pl-11"} 
                            />
                        </div>
                    </div>

                    {/* Address & City */}
                    <div>
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 ml-1">
                            {t('business.addressLabel', 'Adresa')}
                        </label>
                        <div className="relative group">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input 
                                type="text" 
                                value={formData.address} 
                                onChange={(e) => setFormData({...formData, address: e.target.value})} 
                                className={inputClasses + " pl-11"} 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 ml-1">
                            {t('business.cityLabel', 'Qyteti')}
                        </label>
                        <div className="relative group">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input 
                                type="text" 
                                value={formData.city} 
                                onChange={(e) => setFormData({...formData, city: e.target.value})} 
                                className={inputClasses + " pl-11"} 
                            />
                        </div>
                    </div>

                    {/* Website & Tax ID */}
                    <div>
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 ml-1">
                            {t('business.websiteLabel', 'Website')}
                        </label>
                        <div className="relative group">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input 
                                type="text" 
                                value={formData.website} 
                                onChange={(e) => setFormData({...formData, website: e.target.value})} 
                                className={inputClasses + " pl-11"} 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 ml-1">
                            {t('business.taxIdLabel', 'Numri Fiskal')}
                        </label>
                        <div className="relative group">
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input 
                                type="text" 
                                value={formData.tax_id} 
                                onChange={(e) => setFormData({...formData, tax_id: e.target.value})} 
                                className={inputClasses + " pl-11"} 
                            />
                        </div>
                    </div>

                    {/* Fiscal Parameters */}
                    <div className="col-span-1 md:col-span-2 pt-8 border-t border-border-main mt-4">
                        <SectionHeader icon={<Calculator size={18} />} title="Parametrat Fiskal" />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 ml-1">
                                    {t('business.vatRateLabel', 'TVSH %')}
                                </label>
                                <input 
                                    type="number" 
                                    value={formData.vat_rate} 
                                    onChange={(e) => setFormData({...formData, vat_rate: parseFloat(e.target.value)})} 
                                    className={inputClasses} 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 ml-1">
                                    {t('business.targetMarginLabel', 'Margjina %')}
                                </label>
                                <div className="relative group">
                                    <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                    <input 
                                        type="number" 
                                        value={formData.target_margin} 
                                        onChange={(e) => setFormData({...formData, target_margin: parseFloat(e.target.value)})} 
                                        className={inputClasses + " pl-11"} 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 ml-1">
                                    {t('business.currencyLabel', 'Monedha')}
                                </label>
                                <div className="relative group">
                                    <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                    <select 
                                        value={formData.currency} 
                                        onChange={(e) => setFormData({...formData, currency: e.target.value})} 
                                        className={`${inputClasses} pl-11 appearance-none cursor-pointer`}
                                    >
                                        <option value="EUR">Euro (€)</option>
                                        <option value="LEK">Lek (ALL)</option>
                                        <option value="USD">Dollar ($)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- FOOTER --- */}
                <div className="pt-8 mt-8 border-t border-border-main/50 flex justify-end">
                    <button 
                        type="submit" 
                        disabled={saving} 
                        className="btn-primary px-10 py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover-lift"
                    >
                        {saving ? <Loader2 className="animate-spin" /> : <><Save size={18} className="inline mr-2" />{t('general.save')}</>}
                    </button>
                </div>
            </form>

            {/* Additional panels (Subscription, Inbox, Team) remain outside the main form */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 space-y-6">
                    {/* Subscription Panel */}
                    <Panel className="p-6 border border-border-main bg-surface/30 backdrop-blur-sm shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-text-muted">Abonimi</h4>
                            <div className="px-2 py-0.5 bg-primary-start/10 rounded border border-primary-start/30 text-primary-start text-xs font-black uppercase tracking-widest flex items-center gap-1">
                                <Crown size={10} /> {currentPlan}
                            </div>
                        </div>
                    </Panel>

                    {/* Inbox Card */}
                    <div onClick={() => navigate('/business/inbox')} className="cursor-pointer">
                        <Panel className="p-6 hover:border-primary-start/30 transition-all shadow-sm border border-border-main bg-surface/30 backdrop-blur-sm hover-lift">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-2xl bg-primary-start/20 text-primary-start border border-border-main"><Mail size={20} /></div>
                                    <div><h3 className="font-bold text-lg text-text-primary">Inbox</h3><p className="text-sm text-text-muted">Mesazhe</p></div>
                                </div>
                                <ArrowRight size={20} className="text-text-muted" />
                            </div>
                        </Panel>
                    </div>

                    {/* Team Panel (if owner) – using FormField */}
                    {user?.organization_role === 'OWNER' && (
                        <Panel className="p-6 border border-border-main bg-surface/30 backdrop-blur-sm shadow-sm">
                            <SectionHeader icon={<Users size={16} />} title="Ekipi" />
                            <form onSubmit={handleInviteUser} className="mb-6">
                                <FormField label="Email" icon={<Mail size={16} />}>
                                    <input 
                                        type="email" 
                                        value={inviteEmail} 
                                        onChange={(e) => setInviteEmail(e.target.value)} 
                                        disabled={isPlanFull} 
                                        className="glass-input w-full pl-11 border border-border-main bg-surface/30 backdrop-blur-sm text-text-primary placeholder:text-text-muted" 
                                        placeholder="email@ekipi.com" 
                                    />
                                </FormField>
                                <button 
                                    type="submit" 
                                    disabled={inviting} 
                                    className="w-full mt-4 py-2 btn-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover-lift shadow-sm"
                                >
                                    {inviting ? <Loader2 className="animate-spin" size={12} /> : <UserPlus size={12}/>} FTO ANËTARIN
                                </button>
                            </form>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {teamMembers.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-2.5 bg-surface/50 backdrop-blur-sm rounded-xl border border-border-main">
                                        <p className="text-xs text-text-secondary truncate max-w-[70%]">{member.email}</p>
                                        <button 
                                            onClick={() => handleRemoveMember(member.id)} 
                                            className="p-1.5 rounded-md text-text-muted hover:text-danger-start hover:bg-danger-start/10 transition-colors hover-lift"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </Panel>
                    )}
                </div>
            </div>
        </motion.div>
    );
};