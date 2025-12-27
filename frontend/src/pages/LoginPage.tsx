// FILE: src/pages/LoginPage.tsx
// PHOENIX PROTOCOL - LOGIN PAGE V3.0 (TACTICAL UPGRADE)
// 1. STYLE: Applied Phoenix Glassmorphism to the login panel and form elements.
// 2. CONSISTENCY: Aligned fonts, colors, and spacing with the new UI standard.
// 3. UX: Enhanced visual feedback on all interactive elements.

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
    <div className="min-h-screen flex items-center justify-center bg-background-dark p-4 font-sans">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-blue-900/10 pointer-events-none" />
        
        <div className="relative max-w-md w-full space-y-8 p-8 bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl shadow-blue-900/20">
            <div className="flex justify-center">
                <BrandLogo />
            </div>

            <div className="text-center">
                <h2 className="text-3xl font-black text-white tracking-tight">{t('auth.loginTitle')}</h2>
                <p className="mt-2 text-sm text-gray-400">{t('auth.loginSubtitle')}</p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div className="group">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            {t('auth.usernameOrEmail')}
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                            </div>
                            <input 
                                type="text" 
                                required 
                                value={identity} 
                                onChange={(e) => setIdentity(e.target.value)} 
                                className="block w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:border-blue-500/50 outline-none transition-all" 
                                placeholder={t('auth.usernameOrEmailPlaceholder')} 
                            />
                        </div>
                    </div>
                    <div className="group">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('auth.password')}</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                            </div>
                            <input 
                                type="password" 
                                required 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                className="block w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:border-blue-500/50 outline-none transition-all" 
                                placeholder="••••••••" 
                            />
                        </div>
                    </div>
                </div>

                {error && <div className="text-red-400 text-sm text-center bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">{error}</div>}

                <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full flex justify-center py-4 px-4 rounded-2xl text-white bg-gradient-to-r from-blue-600 to-blue-700 font-bold shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all"
                >
                    {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : t('auth.loginButton')}
                </button>
            </form>

            <div className="text-center text-sm">
                <span className="text-gray-400">{t('auth.noAccount')} </span>
                <Link to="/register" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">{t('auth.registerLink')}</Link>
            </div>
      </div>
    </div>
  );
};

export default LoginPage;