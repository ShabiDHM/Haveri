// FILE: src/pages/LoginPage.tsx
// PHOENIX PROTOCOL - LOGIN PAGE V6.1 (EXECUTIVE DESIGN SYSTEM)
// UPDATED: Added hover-lift, shadow-sm, semantic border and text classes.
// RETAINED: All logic and functionality.

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { User, Lock, Loader2 } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

const LoginPage: React.FC = () => {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(identity, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Login Error:", err);
      let msg = t('auth.loginFailed');
      if (err.response?.data?.detail) {
          if (typeof err.response.data.detail === 'string') {
              msg = err.response.data.detail;
          } else if (Array.isArray(err.response.data.detail)) {
              msg = err.response.data.detail.map((e: any) => e.msg).join(', ');
          } else {
              msg = JSON.stringify(err.response.data.detail);
          }
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4 font-sans relative">
        {/* Ambient gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-start/20 via-transparent to-primary-start/10 pointer-events-none" />
        
        <div className="relative max-w-md w-full space-y-8 p-8 glass-panel border border-border-main shadow-sm">
            <div className="flex justify-center">
                <BrandLogo />
            </div>

            <div className="text-center">
                <h2 className="text-3xl font-black text-text-primary tracking-tight">{t('auth.loginTitle')}</h2>
                <p className="mt-2 text-sm text-text-secondary">{t('auth.loginSubtitle')}</p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div className="group">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">
                            {t('auth.usernameOrEmail')}
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-text-muted group-focus-within:text-primary-start transition-colors" />
                            </div>
                            <input 
                                type="text" 
                                required 
                                value={identity} 
                                onChange={(e) => setIdentity(e.target.value)} 
                                className="glass-input w-full pl-12 border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all" 
                                placeholder={t('auth.usernameOrEmailPlaceholder')} 
                            />
                        </div>
                    </div>
                    <div className="group">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">{t('auth.password')}</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-text-muted group-focus-within:text-primary-start transition-colors" />
                            </div>
                            <input 
                                type="password" 
                                required 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                className="glass-input w-full pl-12 border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all" 
                                placeholder="••••••••" 
                            />
                        </div>
                    </div>
                </div>

                {error && <div className="text-danger-start text-sm text-center bg-danger-start/10 p-3 rounded-xl border border-danger-start/30 shadow-sm">{error}</div>}

                <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="btn-primary w-full flex justify-center py-4 rounded-xl hover-lift shadow-sm disabled:opacity-50"
                >
                    {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : t('auth.loginButton')}
                </button>
            </form>

            <div className="text-center text-sm">
                <span className="text-text-secondary">{t('auth.noAccount')} </span>
                <Link to="/register" className="font-medium text-primary-start hover:text-primary-start/80 transition-colors hover-lift inline-block">
                    {t('auth.registerLink')}
                </Link>
            </div>
      </div>
    </div>
  );
};

export default LoginPage;