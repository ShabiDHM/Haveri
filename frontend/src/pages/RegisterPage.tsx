// FILE: src/pages/RegisterPage.tsx
// PHOENIX PROTOCOL - REGISTER PAGE V3.0 (TACTICAL UPGRADE)
// 1. STYLE: Applied Phoenix Glassmorphism to all panels, inputs, and buttons.
// 2. CONSISTENCY: Aligned fonts, colors, and spacing with the new LoginPage style.
// 3. UX: Enhanced visual feedback on all interactive elements.

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
        <div className="min-h-screen flex items-center justify-center bg-background-dark p-4 font-sans">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-blue-900/10 pointer-events-none" />
            
            <div className="relative max-w-md w-full p-8 bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-white/10 text-center shadow-2xl shadow-emerald-900/20">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <Sparkles className="w-10 h-10 text-emerald-400" />
                </div>
                
                <h2 className="text-3xl font-black text-white mb-3">
                    {t('auth.welcomeTitle', 'Mirë se erdhët në të ardhmen')}
                </h2>
                
                <p className="text-gray-400 mb-8 leading-relaxed">
                    {t('auth.welcomeMessage', 'Llogaria juaj është krijuar. Ndërsa ekipi ynë verifikon të dhënat, ju jeni një hap më afër bashkimit të inteligjencës njerëzore me fuqinë e të dhënave për të transformuar mënyrën se si menaxhoni biznesin.')}
                </p>
                
                <Link to="/login" className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-95">
                    {t('auth.backToLogin', 'Kthehu te Kyçja')} <ArrowRight className="w-5 h-5" />
                </Link>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark p-4 font-sans">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-blue-900/10 pointer-events-none" />
      
      <div className="relative max-w-md w-full p-8 bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl shadow-blue-900/20">
        
        <div className="mb-6 flex justify-center">
            <BrandLogo />
        </div>

        <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-white tracking-tight">{t('auth.registerTitle')}</h2>
            <p className="text-gray-400 mt-2 text-sm">{t('auth.registerSubtitle')}</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="group">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('account.username')}</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                    <input 
                        type="text" 
                        required 
                        minLength={3}
                        placeholder={t('auth.usernamePlaceholder')}
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:border-blue-500/50 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="group">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('account.email')}</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                    <input 
                        type="email" 
                        required 
                        placeholder={t('auth.emailPlaceholder')}
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:border-blue-500/50 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="group">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('auth.password')}</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                    <input 
                        type="password" 
                        required 
                        minLength={8}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:border-blue-500/50 outline-none transition-all"
                    />
                </div>
                <p className="text-xs text-gray-500 text-right mt-1">{t('auth.passwordMinChars')}</p>
            </div>
            
            {error && (
                <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-400 text-sm">
                    <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-95"
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

        <div className="mt-8 text-center text-sm text-gray-400">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                {t('auth.signInLink')}
            </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;