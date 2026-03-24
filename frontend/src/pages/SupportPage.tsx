// FILE: src/pages/SupportPage.tsx
// PHOENIX PROTOCOL - SUPPORT PAGE V21.1 (EXECUTIVE DESIGN SYSTEM)
// UPDATED: Semantic Tailwind classes, hover-lift, shadow-sm, consistent backdrop blur.
// RETAINED: All logic and functionality.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, MapPin, Send, Loader2, Lock, User, AtSign, MessageSquare } from 'lucide-react';
import { apiService } from '../services/api';
import PrivacyModal from '../components/PrivacyModal';

const FormField = ({ icon, children }: { icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="relative group">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary-start transition-colors pointer-events-none">
            {icon}
        </span>
        {children}
    </div>
);

const SupportPage: React.FC = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiService.sendContactForm(formData);
      alert(t('support.successMessage', 'Mesazhi u dërgua me sukses!'));
      setFormData({ firstName: '', lastName: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error(error);
      alert(t('error.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-text-primary mb-2">{t('support.title', 'Qendra e Ndihmës')}</h1>
            <p className="text-lg text-text-secondary">{t('support.subtitle', "Ne jemi këtu për t'ju ndihmuar.")}</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 auto-rows-fr">
          {/* Left Column */}
          <div className="flex flex-col gap-8">
            <div className="glass-panel p-8 flex-1 flex flex-col border border-border-main shadow-sm hover-lift">
              <h3 className="text-2xl font-bold mb-6 text-text-primary">{t('support.contactInfo', 'Informacion Kontakti')}</h3>
              <div className="space-y-6 text-text-secondary text-lg">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-start/10 rounded-xl border border-primary-start/30 text-primary-start"><Phone /></div>
                    <span>+383 44 987 898</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-start/10 rounded-xl border border-primary-start/30 text-primary-start"><MapPin /></div>
                    <span>Xhavit Haziri 10, 10000 Prishtinë</span>
                </div>
              </div>
            </div>

            <div className="glass-panel p-8 flex-1 flex flex-col border border-border-main shadow-sm hover-lift">
              <h3 className="text-2xl font-bold mb-4 text-text-primary">{t('support.legalInfo', 'Informacione Ligjore')}</h3>
              <p className="text-text-secondary text-sm mb-6 flex-1">{t('support.legalDesc', 'Lexoni politikën tonë të privatësisë për të kuptuar se si i mbrojmë të dhënat tuaja.')}</p>
              <button 
                onClick={() => setIsPrivacyOpen(true)}
                className="w-full flex justify-center items-center gap-3 py-3 rounded-xl bg-primary-start/10 text-primary-start font-bold hover:bg-primary-start/20 transition-all border border-primary-start/30 hover-lift shadow-sm"
              >
                <Lock className="h-5 w-5" /> {t('support.privacyTitle', 'Politika e Privatësisë')}
              </button>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="glass-panel p-8 border border-border-main shadow-sm">
            <h3 className="text-2xl font-bold mb-8 text-text-primary">{t('support.sendMessage', 'Na Dërgoni Mesazh')}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">{t('auth.firstName', 'Emri')}</label>
                  <FormField icon={<User />}>
                      <input type="text" placeholder={t('auth.firstName', 'Emri')} required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="glass-input w-full pl-12 border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all" />
                  </FormField>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">{t('auth.lastName', 'Mbiemri')}</label>
                  <FormField icon={<User />}>
                      <input type="text" placeholder={t('auth.lastName', 'Mbiemri')} required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="glass-input w-full pl-12 border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all" />
                  </FormField>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">{t('auth.email', 'Email')}</label>
                <FormField icon={<AtSign />}>
                  <input type="email" placeholder={t('auth.email', 'Email')} required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="glass-input w-full pl-12 border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all" />
                </FormField>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">{t('support.message', 'Mesazhi')}</label>
                <FormField icon={<MessageSquare />}>
                  <textarea placeholder={t('support.messagePlaceholder', 'Mesazhi juaj...')} required rows={5} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="glass-input w-full pl-12 resize-none border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all" />
                </FormField>
              </div>
              
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex justify-center items-center gap-3 py-4 rounded-xl disabled:opacity-50 hover-lift shadow-sm">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send className="h-5 w-5" /> {t('support.sendButton', 'Dërgo')}</>}
              </button>
            </form>
          </div>
        </div>
      </div>
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </>
  );
};

export default SupportPage;