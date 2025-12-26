// FILE: src/components/business/ProfileTab.tsx
// PHOENIX PROTOCOL - PROFILE TAB V17.1 (FULL STACK INTEGRATION)
// 1. LOGIC: Reads/Writes VAT & Margin directly to Database (via API).
// 2. CLEANUP: Removed temporary LocalStorage logic.
// 3. STATUS: Production Ready.

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Building2, Mail, Phone, Palette, Save, Upload, Loader2, Camera, MapPin, Globe, CreditCard,
    TrendingUp, Calculator, Coins
} from 'lucide-react';
import { apiService, API_V1_URL } from '../../services/api';
import { BusinessProfile, BusinessProfileUpdate } from '../../data/types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_COLOR = '#3b82f6';

export const ProfileTab: React.FC = () => {
    const { t } = useTranslation();
    const { refreshBusinessProfile } = useAuth();
    const [profile, setProfile] = useState<BusinessProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logoSrc, setLogoSrc] = useState<string | null>(null);
    const [logoLoading, setLogoLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<BusinessProfileUpdate>({
        firm_name: '', email_public: '', phone: '', address: '', city: '', website: '', tax_id: '', branding_color: DEFAULT_COLOR,
        vat_rate: 18, target_margin: 30, currency: 'EUR'
    });

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
    }, []);

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

    if (loading) return <div className="flex justify-center h-64 items-center"><Loader2 className="animate-spin text-primary-start" /></div>;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 pb-10">
            <div className="space-y-6 sm:space-y-8">
                {/* LOGO CARD */}
                <div className="bg-background-dark border border-glass-edge rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 w-full h-1.5 bg-gradient-to-r from-primary-start to-primary-end" />
                    <h3 className="text-white font-bold mb-6 sm:mb-8 self-start text-base sm:text-lg">{t('business.logoIdentity')}</h3>
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden flex items-center justify-center border-4 transition-all shadow-2xl ${logoSrc ? 'border-white/20' : 'border-dashed border-gray-700 hover:border-primary-start'}`}>
                            {logoLoading ? <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-primary-start" /> : logoSrc ? <img src={logoSrc} alt="Logo" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" onError={() => setLogoSrc(null)} /> : <div className="text-center group-hover:scale-110 transition-transform"><Upload className="w-8 h-8 sm:w-10 sm:h-10 text-gray-600 mx-auto mb-2" /><span className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider">{t('business.upload')}</span></div>}
                        </div>
                        <div className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"><Camera className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow-lg" /></div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                </div>

                {/* BRANDING CARD */}
                <div className="bg-background-dark border border-glass-edge rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1.5 bg-gradient-to-r from-pink-500 to-purple-600" />
                    <h3 className="text-white font-bold mb-4 sm:mb-6 flex items-center gap-2 text-base sm:text-lg"><Palette className="w-5 h-5 text-purple-400" /> {t('business.branding')}</h3>
                    <div className="flex items-center gap-4 mb-4 sm:mb-6">
                        <div className="relative overflow-hidden w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border-2 border-white/10 shadow-inner"><input type="color" value={formData.branding_color || DEFAULT_COLOR} onChange={(e) => setFormData({ ...formData, branding_color: e.target.value })} className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer" /></div>
                        <div className="flex-1"><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-base sm:text-lg">#</span><input type="text" value={(formData.branding_color || DEFAULT_COLOR).replace('#', '')} onChange={(e) => setFormData({ ...formData, branding_color: `#${e.target.value}` })} className="w-full bg-background-light/50 border border-glass-edge rounded-xl pl-8 pr-4 py-2 sm:py-3 text-white font-mono uppercase focus:ring-2 focus:ring-primary-start outline-none transition-all text-sm sm:text-base" /></div></div>
                    </div>
                    <button type="button" onClick={handleColorSave} disabled={saving} className="w-full py-2.5 sm:py-3 rounded-xl text-white font-bold text-sm shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: formData.branding_color || DEFAULT_COLOR }}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {t('business.saveColor')}
                    </button>
                </div>
            </div>

            {/* FORM CARD */}
            <div className="md:col-span-2 space-y-6 sm:space-y-8">
                <form onSubmit={handleProfileSubmit} className="bg-background-dark border border-glass-edge rounded-3xl p-6 sm:p-8 space-y-6 sm:space-y-8 shadow-xl relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500" />
                    
                    {/* SECTION 1: IDENTITY */}
                    <div>
                        <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-3 mb-6"><Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-start" />{t('business.firmData')}</h3>
                        <div className="space-y-4 sm:space-y-6">
                            <div className="group">
                                <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 sm:mb-2">{t('business.firmNameLabel')}</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-3 sm:top-3.5 w-4 h-4 sm:w-5 sm:h-5 text-gray-500 group-focus-within:text-primary-start transition-colors" />
                                    <input type="text" name="firm_name" value={formData.firm_name} onChange={(e) => setFormData({ ...formData, firm_name: e.target.value })} className="w-full bg-background-light/50 border border-glass-edge rounded-xl pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-white focus:ring-2 focus:ring-primary-start outline-none transition-all text-sm sm:text-base" placeholder={t('business.firmNamePlaceholder')} />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div className="group"><label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 sm:mb-2">{t('business.publicEmail')}</label><div className="relative"><Mail className="absolute left-4 top-3 sm:top-3.5 w-4 h-4 sm:w-5 sm:h-5 text-gray-500 group-focus-within:text-primary-start transition-colors" /><input type="email" name="email_public" value={formData.email_public} onChange={(e) => setFormData({ ...formData, email_public: e.target.value })} className="w-full bg-background-light/50 border border-glass-edge rounded-xl pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-white focus:ring-2 focus:ring-primary-start outline-none transition-all text-sm sm:text-base" /></div></div>
                                <div className="group"><label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 sm:mb-2">{t('business.phone')}</label><div className="relative"><Phone className="absolute left-4 top-3 sm:top-3.5 w-4 h-4 sm:w-5 sm:h-5 text-gray-500 group-focus-within:text-primary-start transition-colors" /><input type="text" name="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-background-light/50 border border-glass-edge rounded-xl pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-white focus:ring-2 focus:ring-primary-start outline-none transition-all text-sm sm:text-base" /></div></div>
                            </div>
                            
                            <div className="group"><label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 sm:mb-2">{t('business.address')}</label><div className="relative"><MapPin className="absolute left-4 top-3 sm:top-3.5 w-4 h-4 sm:w-5 sm:h-5 text-gray-500 group-focus-within:text-primary-start transition-colors" /><input type="text" name="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full bg-background-light/50 border border-glass-edge rounded-xl pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-white focus:ring-2 focus:ring-primary-start outline-none transition-all text-sm sm:text-base" /></div></div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div className="group"><label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 sm:mb-2">{t('business.city')}</label><input type="text" name="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full bg-background-light/50 border border-glass-edge rounded-xl px-4 py-2.5 sm:py-3 text-white focus:ring-2 focus:ring-primary-start outline-none transition-all text-sm sm:text-base" /></div>
                                <div className="group"><label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 sm:mb-2">{t('business.website')}</label><div className="relative"><Globe className="absolute left-4 top-3 sm:top-3.5 w-4 h-4 sm:w-5 sm:h-5 text-gray-500 group-focus-within:text-primary-start transition-colors" /><input type="text" name="website" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="w-full bg-background-light/50 border border-glass-edge rounded-xl pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-white focus:ring-2 focus:ring-primary-start outline-none transition-all text-sm sm:text-base" /></div></div>
                            </div>
                            
                            <div className="group"><label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 sm:mb-2">{t('business.taxId')}</label><div className="relative"><CreditCard className="absolute left-4 top-3 sm:top-3.5 w-4 h-4 sm:w-5 sm:h-5 text-gray-500 group-focus-within:text-primary-start transition-colors" /><input type="text" name="tax_id" value={formData.tax_id} onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })} className="w-full bg-background-light/50 border border-glass-edge rounded-xl pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-white focus:ring-2 focus:ring-primary-start outline-none transition-all text-sm sm:text-base" /></div></div>
                        </div>
                    </div>

                    {/* SECTION 2: FISCAL CONFIGURATION */}
                    <div className="pt-6 border-t border-white/5">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Calculator className="w-5 h-5 text-amber-400" /> Konfigurimi Fiskal & Inteligjenca</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="group">
                                <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Norma e TVSH (%)</label>
                                <div className="relative">
                                    <input type="number" value={formData.vat_rate} onChange={(e) => setFormData({...formData, vat_rate: parseFloat(e.target.value)})} className="w-full bg-background-light/50 border border-glass-edge rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-amber-400 outline-none transition-all pl-4" />
                                    <span className="absolute right-4 top-2.5 text-gray-500 font-bold">%</span>
                                </div>
                            </div>
                            <div className="group">
                                <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Marzhi i Dëshiruar (%)</label>
                                <div className="relative">
                                    <input type="number" value={formData.target_margin} onChange={(e) => setFormData({...formData, target_margin: parseFloat(e.target.value)})} className="w-full bg-background-light/50 border border-glass-edge rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all pl-10" />
                                    <TrendingUp className="absolute left-4 top-2.5 w-4 h-4 text-emerald-500" />
                                </div>
                            </div>
                            <div className="group">
                                <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Monedha</label>
                                <div className="relative">
                                    <select value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} className="w-full bg-background-light/50 border border-glass-edge rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-400 outline-none transition-all pl-10 appearance-none cursor-pointer">
                                        <option value="EUR">Euro (€)</option>
                                        <option value="LEK">Lek (ALL)</option>
                                        <option value="USD">Dollar ($)</option>
                                    </select>
                                    <Coins className="absolute left-4 top-2.5 w-4 h-4 text-blue-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-2 sm:pt-4 flex justify-end">
                        <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 sm:px-10 py-3 sm:py-3.5 bg-gradient-to-r from-primary-start to-primary-end text-white rounded-xl font-bold hover:shadow-lg hover:shadow-primary-start/20 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 text-sm sm:text-base w-full sm:w-auto justify-center">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}{t('general.save')}
                        </button>
                    </div>
                </form>
            </div>
        </motion.div>
    );
};