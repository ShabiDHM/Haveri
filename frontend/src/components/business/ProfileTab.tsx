// FILE: src/components/business/ProfileTab.tsx
// PHOENIX PROTOCOL - PROFILE TAB V31.6 (CONSISTENT CARD STYLES)

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Building2, Mail, Phone, Save, Upload, Loader2, Camera, MapPin, Globe, CreditCard,
  TrendingUp, Calculator, Coins, Users, UserPlus, Trash2, Crown, ArrowRight, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { apiService, API_V1_URL } from '../../services/api';
import { BusinessProfile, BusinessProfileUpdate, User } from '../../data/types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getPlanLimits, canInviteMoreMembers, getRemainingMemberSlots, PlanTier } from '../../config/plans';



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
  const [showFiscalParams, setShowFiscalParams] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  // PHOENIX: Use centralized plan configuration
  const currentPlan = (user?.plan_tier || 'SOLO') as PlanTier;
  const planConfig = getPlanLimits(currentPlan);
  const maxUsers = planConfig.maxMembers;
  const currentMemberCount = teamMembers.length;
  const remainingSlots = getRemainingMemberSlots(currentMemberCount, currentPlan);
  const isPlanFull = !canInviteMoreMembers(currentMemberCount, currentPlan);
  const usagePercentage = (currentMemberCount / maxUsers) * 100;

  const [formData, setFormData] = useState<BusinessProfileUpdate>({
    firm_name: '',
    email_public: '',
    phone: '',
    address: '',
    city: '',
    website: '',
    tax_id: '',
    vat_rate: 18,
    target_margin: 30,
    currency: 'EUR',
  });

  const fetchTeam = useCallback(async () => {
    if (user?.organization_role !== 'OWNER') return;
    setTeamLoading(true);
    try {
      const members = await apiService.getTeamMembers();
      setTeamMembers(members);
    } catch (error) {
      console.error(error);
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
          currency: data.currency || 'EUR',
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    fetchTeam();
  }, [fetchTeam]);

  useEffect(() => {
    const url = profile?.logo_url;
    if (url) {
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        setLogoSrc(url);
        return;
      }
      setLogoLoading(true);
      apiService
        .fetchImageBlob(url)
        .then((blob: Blob) => setLogoSrc(URL.createObjectURL(blob)))
        .catch(() => {
          const cleanBase = API_V1_URL.endsWith('/') ? API_V1_URL.slice(0, -1) : API_V1_URL;
          const cleanPath = url.startsWith('/') ? url.slice(1) : url;
          setLogoSrc(`${cleanBase}/${cleanPath}`);
        })
        .finally(() => setLogoLoading(false));
    }
  }, [profile?.logo_url]);

  const parseNumber = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (trimmed === '') return undefined;
    const num = Number(trimmed);
    return isNaN(num) ? undefined : num;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: BusinessProfileUpdate = {
        firm_name: formData.firm_name || undefined,
        email_public: formData.email_public || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        website: formData.website || undefined,
        tax_id: formData.tax_id || undefined,
        vat_rate: formData.vat_rate !== undefined && !isNaN(formData.vat_rate) ? formData.vat_rate : undefined,
        target_margin: formData.target_margin !== undefined && !isNaN(formData.target_margin) ? formData.target_margin : undefined,
        currency: formData.currency || 'EUR',
      };
      await apiService.updateBusinessProfile(payload);
      alert(t('saveSuccess'));
      await refreshBusinessProfile();
    } catch (err) {
      console.error(err);
      alert(t('error.generic'));
    } finally {
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
    } catch {
      alert(t('business.logoUploadFailed'));
    } finally {
      setLogoLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    
    if (isPlanFull) {
      alert(`Keni arritur limitin e anëtarëve për planin tuaj ${planConfig.name}. Për të shtuar më shumë anëtarë, ju lutemi përmirësoni planin tuaj.`);
      return;
    }
    
    setInviting(true);
    try {
      await apiService.inviteUser({ email: inviteEmail, role: 'MEMBER' });
      alert(`Ftesa u dërgua në ${inviteEmail}`);
      setInviteEmail('');
      fetchTeam();
    } catch (err: any) {
      console.error('Invite error:', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'Ftesa dështoi.';
      
      if (errorMessage.includes('Plan limit reached') || errorMessage.includes('limit')) {
        alert(`Keni arritur limitin e anëtarëve për planin tuaj ${planConfig.name}. Përmirësoni planin për të ftuar më shumë anëtarë.`);
      } else if (errorMessage.includes('already invited')) {
        alert(`Përdoruesi ${inviteEmail} tashmë është i ftuar.`);
      } else if (errorMessage.includes('already a member')) {
        alert(`Përdoruesi ${inviteEmail} është tashmë anëtar i ekipit.`);
      } else {
        alert(errorMessage);
      }
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (window.confirm('A jeni i sigurt që doni ta hiqni këtë anëtar?')) {
      try {
        await apiService.removeTeamMember(id);
        fetchTeam();
      } catch {
        alert('Dështoi heqja e anëtarit.');
      }
    }
  };

  if (loading)
    return (
      <div className="flex justify-center h-96 items-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary-start" />
      </div>
    );

  const inputClasses = 'glass-input w-full pl-11 text-sm border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all bg-surface/30 backdrop-blur-sm';

  return (
    <div className="flex flex-col min-h-screen bg-base text-text-primary">
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 pb-24">
        <div className="glass-panel p-5 sm:p-6 md:p-8 flex flex-col border border-border-main shadow-sm">
          
          {/* Header - Consistent with Stoku tab */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-border-main shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-start/10 rounded-xl border border-border-main">
                <Building2 className="text-primary-start" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-text-primary tracking-tight uppercase">
                  {t('business.firmData', 'Të dhënat e Zyrës')}
                </h1>
                <p className="text-xs font-black uppercase tracking-widest text-text-muted mt-1">
                  {t('business.firmDataSub', 'Konfigurimi i profilit të zyrës')}
                </p>
              </div>
            </div>
            
            {/* Logo Upload */}
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-20 h-20 rounded-full bg-surface/50 border-2 border-border-main flex items-center justify-center overflow-hidden shadow-sm transition-all hover:border-primary-start/50 hover-lift">
                {logoLoading ? (
                  <Loader2 className="animate-spin text-primary-start" size={24} />
                ) : logoSrc ? (
                  <img src={logoSrc} className="w-full h-full object-cover" alt="Logo" />
                ) : (
                  <Camera size={24} className="text-text-muted" />
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Upload size={16} className="text-white" />
              </div>
              <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
            </div>
          </div>

          {/* Two‑column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
            {/* Left column - Consistent card styling */}
            <div className="lg:col-span-4 space-y-6">
              {/* Subscription Card */}
              <div className="bg-surface/30 backdrop-blur-sm border border-border-main rounded-2xl p-5 shadow-sm hover-lift transition-all">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-widest text-text-muted">Abonimi</h4>
                  <div className="px-3 py-1 bg-primary-start/10 rounded-full border border-primary-start/30 text-primary-start text-xs font-black uppercase tracking-widest flex items-center gap-1">
                    <Crown size={12} /> {currentPlan}
                  </div>
                </div>
              </div>

              {/* Inbox Card */}
              <div onClick={() => navigate('/business/inbox')} className="cursor-pointer">
                <div className="bg-surface/30 backdrop-blur-sm border border-border-main rounded-2xl p-5 hover:border-primary-start/30 transition-all shadow-sm hover-lift">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary-start/10 text-primary-start border border-border-main">
                        <Mail size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-text-primary">Inbox</h3>
                        <p className="text-xs text-text-muted">Mesazhe</p>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-text-muted" />
                  </div>
                </div>
              </div>

              {/* Team Management Card */}
              {user?.organization_role === 'OWNER' && (
                <div className="bg-surface/30 backdrop-blur-sm border border-border-main rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 rounded-xl bg-primary-start/10 text-primary-start border border-border-main">
                      <Users size={16} />
                    </div>
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Ekipi</h3>
                  </div>
                  
                  {/* Team Status Indicator */}
                  <div className="mb-5 p-4 rounded-xl bg-surface/50 backdrop-blur-sm border border-border-main">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black uppercase tracking-widest text-text-muted">Përdoruesit</span>
                      <span className="text-xs font-bold text-text-primary">
                        {currentMemberCount} / {maxUsers}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${usagePercentage >= 90 ? 'bg-warning-start' : 'bg-primary-start'}`}
                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                      />
                    </div>
                    {isPlanFull && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-warning-start">
                        <AlertCircle size={12} />
                        <span>Keni arritur limitin e anëtarëve për planin {planConfig.name}.</span>
                      </div>
                    )}
                    {remainingSlots > 0 && remainingSlots <= 2 && (
                      <div className="mt-3 text-[10px] text-text-muted">
                        {remainingSlots} vend(et) të lira. Përmirësoni planin për më shumë anëtarë.
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleInviteUser} className="mb-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">Email</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary-start transition-colors">
                          <Mail size={14} />
                        </span>
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          disabled={isPlanFull}
                          className="glass-input w-full pl-11 bg-canvas border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="email@ekipi.com"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={inviting || isPlanFull}
                      className={`w-full mt-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover-lift shadow-sm ${isPlanFull ? 'bg-warning-start/20 text-warning-start cursor-not-allowed' : 'btn-primary'}`}
                    >
                      {inviting ? <Loader2 className="animate-spin" size={12} /> : <UserPlus size={12} />} 
                      {isPlanFull ? 'Limiti i arritur' : 'FTO ANËTARIN'}
                    </button>
                  </form>

                  {teamLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary-start" size={20} /></div>
                  ) : teamMembers.length === 0 ? (
                    <p className="text-center text-text-muted text-xs py-4">Nuk ka anëtarë në ekip.</p>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-2.5 bg-surface/50 backdrop-blur-sm rounded-xl border border-border-main">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text-primary truncate">{member.email}</p>
                            <p className="text-[10px] text-text-muted uppercase tracking-widest">{member.role}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-1.5 rounded-md text-text-muted hover:text-danger-start hover:bg-danger-start/10 transition-colors hover-lift"
                            title="Hiq anëtarin"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right column – main form */}
            <div className="lg:col-span-8">
              <form onSubmit={handleProfileSubmit}>
                <div className="bg-surface/30 backdrop-blur-sm border border-border-main rounded-2xl p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-primary-start/10 text-primary-start border border-border-main">
                      <Building2 size={18} />
                    </div>
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Konfigurimi</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">Emri</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary-start transition-colors">
                          <Building2 size={14} />
                        </span>
                        <input
                          type="text"
                          value={formData.firm_name}
                          onChange={(e) => setFormData({ ...formData, firm_name: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">Email</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary-start transition-colors">
                          <Mail size={14} />
                        </span>
                        <input
                          type="email"
                          value={formData.email_public}
                          onChange={(e) => setFormData({ ...formData, email_public: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">Telefon</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary-start transition-colors">
                          <Phone size={14} />
                        </span>
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">Adresa</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary-start transition-colors">
                          <MapPin size={14} />
                        </span>
                        <input
                          type="text"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">Qyteti</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary-start transition-colors">
                          <MapPin size={14} />
                        </span>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">Website</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary-start transition-colors">
                          <Globe size={14} />
                        </span>
                        <input
                          type="text"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">Numri Fiskal</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary-start transition-colors">
                          <CreditCard size={14} />
                        </span>
                        <input
                          type="text"
                          value={formData.tax_id}
                          onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                    </div>

                    {/* Fiscal Parameters - Collapsible */}
                    <div className="md:col-span-2 pt-6 border-t border-border-main mt-4">
                      <button
                        type="button"
                        onClick={() => setShowFiscalParams(!showFiscalParams)}
                        className="flex items-center gap-2 text-text-primary hover:text-primary transition-colors w-full text-left mb-4"
                      >
                        <Calculator size={18} />
                        <span className="font-bold text-sm uppercase tracking-wide">Parametrat Fiskal</span>
                        {showFiscalParams ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      {showFiscalParams && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
                          <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">TVSH %</label>
                            <div className="relative group">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary-start transition-colors text-xs font-bold">
                                %
                              </span>
                              <input
                                type="number"
                                value={formData.vat_rate !== undefined ? formData.vat_rate : ''}
                                onChange={(e) => {
                                  const parsed = parseNumber(e.target.value);
                                  setFormData({ ...formData, vat_rate: parsed });
                                }}
                                className={inputClasses}
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">Margjina %</label>
                            <div className="relative group">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary-start transition-colors">
                                <TrendingUp size={14} />
                              </span>
                              <input
                                type="number"
                                value={formData.target_margin !== undefined ? formData.target_margin : ''}
                                onChange={(e) => {
                                  const parsed = parseNumber(e.target.value);
                                  setFormData({ ...formData, target_margin: parsed });
                                }}
                                className={inputClasses}
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">Monedha</label>
                            <div className="relative group">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary-start transition-colors">
                                <Coins size={14} />
                              </span>
                              <select
                                value={formData.currency || ''}
                                onChange={(e) => setFormData({ ...formData, currency: e.target.value || undefined })}
                                className={`${inputClasses} appearance-none cursor-pointer`}
                              >
                                <option value="">Zgjidhni</option>
                                <option value="EUR">Euro (€)</option>
                                <option value="ALL">Lek (ALL)</option>
                                <option value="USD">Dollar ($)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2 mt-6">
                      <button
                        type="submit"
                        className="btn-primary w-full py-3 flex items-center justify-center gap-2 rounded-xl hover-lift shadow-sm"
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                        RUHAJ
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};