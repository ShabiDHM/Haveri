// FILE: src/components/ContactModal.tsx
// PHOENIX PROTOCOL - REAL API INTEGRATION V2.0 (DESIGN SYSTEM ALIGNMENT)
// 1. LOGIC: Switched from 'setTimeout' to 'apiService.sendContactForm'.
// 2. UX: Added error handling and loading states.
// 3. UPDATED: Uses new design system CSS variables for light/dark theme compatibility.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, CheckCircle, MessageSquare, User, Mail, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    phone: '', 
    message: '' 
  });
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    
    try {
        await apiService.sendContactForm(formData);
        
        setIsSending(false);
        setIsSent(true);
        
        setTimeout(() => {
            setIsSent(false);
            setFormData({ firstName: '', lastName: '', email: '', phone: '', message: '' });
            onClose();
        }, 2000);
    } catch (error) {
        console.error("Failed to send contact form:", error);
        alert("Gabim gjatë dërgimit. Ju lutemi provoni përsëri.");
        setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-glass backdrop-blur-xl border border-border-main rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
      >
        <div className="p-5 border-b border-border-main flex justify-between items-center bg-surface/50">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary flex items-center gap-2">
            <MessageSquare className="text-primary h-5 w-5" />
            {t('footer.contactSupport', 'Kontakto Mbështetjen')}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={24} /></button>
        </div>

        <div className="p-5 sm:p-6">
          <AnimatePresence mode='wait'>
            {isSent ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-8 text-center space-y-4"
              >
                <div className="h-16 w-16 bg-success-start/20 rounded-full flex items-center justify-center text-success-start">
                    <CheckCircle size={40} />
                </div>
                <h3 className="text-xl font-bold text-text-primary">Mesazhi u Dërgua!</h3>
                <p className="text-text-secondary">Ekipi ynë do t'ju kontaktojë së shpejti.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-text-muted uppercase">Emri</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-text-muted/50" />
                            <input 
                                type="text" required 
                                value={formData.firstName}
                                onChange={e => setFormData({...formData, firstName: e.target.value})}
                                className="glass-input w-full pl-9 text-sm"
                                placeholder="Emri juaj"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-text-muted uppercase">Mbiemri</label>
                        <input 
                            type="text" required
                            value={formData.lastName}
                            onChange={e => setFormData({...formData, lastName: e.target.value})}
                            className="glass-input w-full text-sm"
                            placeholder="Mbiemri"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-text-muted uppercase">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-text-muted/50" />
                            <input 
                                type="email" required 
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                className="glass-input w-full pl-9 text-sm"
                                placeholder="email@shembull.com"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-text-muted uppercase">Telefoni</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-text-muted/50" />
                            <input 
                                type="tel" 
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                className="glass-input w-full pl-9 text-sm"
                                placeholder="+383 4x xxx xxx"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="space-y-1">
                    <label className="text-xs font-medium text-text-muted uppercase">Mesazhi</label>
                    <textarea 
                        required rows={4}
                        value={formData.message}
                        onChange={e => setFormData({...formData, message: e.target.value})}
                        className="glass-input w-full resize-none text-sm"
                        placeholder="Si mund t'ju ndihmojmë?"
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={isSending}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
                >
                    {isSending ? 'Duke dërguar...' : <><Send size={18} /> Dërgo Mesazhin</>}
                </button>
              </form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default ContactModal;