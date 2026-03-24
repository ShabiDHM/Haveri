// FILE: src/pages/RegisterPage.tsx
// PHOENIX PROTOCOL - REGISTER PAGE V6.1 (EXECUTIVE DESIGN SYSTEM)
// UPDATED: Semantic Tailwind classes (glass-panel, border-border-main, text-text-*, etc.)
// ADDED: hover-lift, shadow-sm, consistent backdrop blur.
// RETAINED: All logic and functionality.

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { useTranslation } from 'react-i18next';
import { User, Mail, Lock, Loader2, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { RegisterRequest } from '../data/types';
import BrandLogo from '../components/BrandLogo';

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username.length < 3) {
        setError(t('auth.usernameTooShort'));
        return;
    }
    if (password.length < 8) {
        setError(t('auth.passwordTooShort'));
        return;
    }

    setIsSubmitting(true);
    
    const payload: RegisterRequest = {
        email,
        password,
        username
    };

    try {
      await apiService.register(payload);
      setIsSuccess(true);
    } catch (err: any) {
      console.error("Registration Error:", err.response?.data);
      
      let msg = t('auth.registerFailed');
      if (err.response?.data?.detail) {
          if (typeof err.response.data.detail === 'string') {
              msg = err.response.data.detail;
          } else if (Array.isArray(err.response.data.detail)) {
              msg = err.response.data.detail.map((e: any) => `${e.loc[1]}: ${e.msg}`).join(', ');
          } else {
              msg = JSON.stringify(err.response.data.detail);
          }
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-canvas p-4 font-sans">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-start/20 via-transparent to-primary-start/10 pointer-events-none" />
            
            <div className="relative max-w-md w-full p-8 glass-panel border border-border-main shadow-sm text-center">
                <div className="w-20 h-20 bg-success-start/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-success-start/20">
                    <Sparkles className="w-10 h-10 text-success-start" />
                </div>
                
                <h2 className="text-3xl font-black text-text-primary mb-3">
                    {t('auth.welcomeTitle', 'Mirë se erdhët në të ardhmen')}
                </h2>
                
                <p className="text-text-secondary mb-8 leading-relaxed">
                    {t('auth.welcomeMessage', 'Llogaria juaj është krijuar. Ndërsa ekipi ynë verifikon të dhënat, ju jeni një hap më afër bashkimit të inteligjencës njerëzore me fuqinë e të dhënave për të transformuar mënyrën se si menaxhoni biznesin.')}
                </p>
                
                <Link to="/login" className="btn-primary inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl hover-lift shadow-sm">
                    {t('auth.backToLogin', 'Kthehu te Kyçja')} <ArrowRight className="w-5 h-5" />
                </Link>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4 font-sans relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-start/20 via-transparent to-primary-start/10 pointer-events-none" />
      
      <div className="relative max-w-md w-full p-8 glass-panel border border-border-main shadow-sm">
        
        <div className="mb-6 flex justify-center">
            <BrandLogo />
        </div>

        <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-text-primary tracking-tight">{t('auth.registerTitle')}</h2>
            <p className="text-text-secondary mt-2 text-sm">{t('auth.registerSubtitle')}</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="group">
                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">{t('account.username')}</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary-start transition-colors" />
                    <input 
                        type="text" 
                        required 
                        minLength={3}
                        placeholder={t('auth.usernamePlaceholder')}
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="glass-input w-full pl-12 border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all"
                    />
                </div>
            </div>

            <div className="group">
                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">{t('account.email')}</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary-start transition-colors" />
                    <input 
                        type="email" 
                        required 
                        placeholder={t('auth.emailPlaceholder')}
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="glass-input w-full pl-12 border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all"
                    />
                </div>
            </div>

            <div className="group">
                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">{t('auth.password')}</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary-start transition-colors" />
                    <input 
                        type="password" 
                        required 
                        minLength={8}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="glass-input w-full pl-12 border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all"
                    />
                </div>
                <p className="text-xs text-text-muted text-right mt-1">{t('auth.passwordMinChars')}</p>
            </div>
            
            {error && (
                <div className="flex items-start gap-3 bg-danger-start/10 border border-danger-start/30 rounded-xl p-3 text-danger-start text-sm shadow-sm">
                    <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <button 
                type="submit" 
                disabled={isSubmitting} 
                className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl hover-lift shadow-sm"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{t('auth.processing')}</span>
                    </>
                ) : (
                    t('auth.createAccount')
                )}
            </button>
        </form>

        <div className="mt-8 text-center text-sm text-text-secondary">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-primary-start hover:text-primary-start/80 font-medium transition-colors hover-lift inline-block">
                {t('auth.signInLink')}
            </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;