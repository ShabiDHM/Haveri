// FILE: src/pages/SupportPage.tsx
// PHOENIX PROTOCOL - SUPPORT PAGE V18.0 (TACTICAL UPGRADE)
// 1. STYLE: Applied Phoenix Glassmorphism to all UI elements for consistency.
// 2. LAYOUT: Enforced perfect column symmetry and height matching using grid.
// 3. UX: Upgraded all interactive elements to the new 'Tactical Command' standard.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, MapPin, Send, Loader2, Lock, User, AtSign, MessageSquare } from 'lucide-react';
import { apiService } from '../services/api';
import PrivacyModal from '../components/PrivacyModal';

const FormField = ({ icon, children }: { icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="relative group">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors pointer-events-none">
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
            <h1 className="text-4xl font-black text-white mb-2">{t('support.title', 'Qendra e Ndihmës')}</h1>
            <p className="text-lg text-gray-400">Ne jemi këtu për t'ju ndihmuar.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 auto-rows-fr">
          {/* Left Column */}
          <div className="flex flex-col gap-8">
            <div className="bg-gray-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl flex-1 flex flex-col">
              <h3 className="text-2xl font-bold mb-6 text-white">{t('support.contactInfo', 'Informacion Kontakti')}</h3>
              <div className="space-y-6 text-gray-300 text-lg">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400"><Phone /></div>
                    <span>+383 44 987 898</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400"><MapPin /></div>
                    <span>Xhavit Haziri 10, 10000 Prishtinë</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl flex-1 flex flex-col">
              <h3 className="text-2xl font-bold mb-4 text-white">{t('support.legalInfo', 'Informacione Ligjore')}</h3>
              <p className="text-gray-400 text-sm mb-6 flex-1">{t('support.legalDesc', 'Lexoni politikën tonë të privatësisë për të kuptuar se si i mbrojmë të dhënat tuaja.')}</p>
              <button 
                onClick={() => setIsPrivacyOpen(true)}
                className="w-full flex justify-center items-center gap-3 py-3 rounded-xl bg-indigo-500/10 text-indigo-400 font-bold hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
              >
                <Lock className="h-5 w-5" /> {t('support.privacyTitle', 'Politika e Privatësisë')}
              </button>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="bg-gray-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-2xl font-bold mb-8 text-white">{t('support.sendMessage', 'Na Dërgoni Mesazh')}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField icon={<User />}>
                    <input type="text" placeholder={t('auth.firstName', 'Emri')} required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-600" />
                </FormField>
                <FormField icon={<User />}>
                    <input type="text" placeholder={t('auth.lastName', 'Mbiemri')} required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-600" />
                </FormField>
              </div>
              <FormField icon={<AtSign />}>
                <input type="email" placeholder={t('auth.email', 'Email')} required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-600" />
              </FormField>
              <FormField icon={<MessageSquare />}>
                <textarea placeholder={t('support.messagePlaceholder', 'Mesazhi juaj...')} required rows={5} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-600 resize-none" />
              </FormField>
              
              <button type="submit" disabled={isSubmitting} className="w-full flex justify-center items-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all">
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