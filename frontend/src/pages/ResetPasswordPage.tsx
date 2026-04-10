// FILE: src/pages/ResetPasswordPage.tsx
// PHOENIX PROTOCOL - RESET PASSWORD PAGE V1.1 (FIXED UNUSED IMPORT)

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, KeyRound, AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';

const ResetPasswordPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isTokenValid, setIsTokenValid] = useState(true);

    useEffect(() => {
        if (!token) {
            setIsTokenValid(false);
            setError(t('resetPassword.missingToken', 'Token-i i rivendosjes mungon.'));
        }
    }, [token, t]);

    const validatePassword = (pass: string): string | null => {
        if (pass.length < 8) {
            return t('resetPassword.passwordTooShort', 'Fjalëkalimi duhet të ketë të paktën 8 karaktere.');
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const passwordError = validatePassword(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        if (password !== confirmPassword) {
            setError(t('resetPassword.passwordsDoNotMatch', 'Fjalëkalimet nuk përputhen.'));
            return;
        }

        if (!token) {
            setError(t('resetPassword.missingToken', 'Token-i i rivendosjes mungon.'));
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await apiService.resetPassword(token, password);
            setSuccess(true);
        } catch (err: any) {
            console.error('Reset password error:', err);
            const errorMessage = err.response?.data?.detail || t('resetPassword.error', 'Ndodhi një gabim. Token-i mund të ketë skaduar.');
            setError(errorMessage);
            if (err.response?.status === 400 || err.response?.status === 404) {
                setIsTokenValid(false);
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!isTokenValid && !success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel max-w-md w-full p-8 rounded-2xl border border-border-main shadow-sm text-center"
                >
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-danger-start/10 flex items-center justify-center border border-danger-start/30">
                        <AlertCircle className="w-8 h-8 text-danger-start" />
                    </div>
                    <h1 className="text-2xl font-black text-text-primary mb-2 uppercase tracking-tighter">
                        {t('resetPassword.invalidToken', 'Token i Pavlefshëm')}
                    </h1>
                    <p className="text-text-secondary mb-6">
                        {t('resetPassword.invalidTokenMessage', 'Link-u i rivendosjes së fjalëkalimit është i pavlefshëm ose ka skaduar.')}
                    </p>
                    <button
                        onClick={() => navigate('/forgot-password')}
                        className="btn-primary w-full py-3 rounded-xl hover-lift shadow-sm"
                    >
                        {t('resetPassword.requestNewLink', 'Kërko një Link të Ri')}
                    </button>
                </motion.div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel max-w-md w-full p-8 rounded-2xl border border-border-main shadow-sm text-center"
                >
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-success-start/10 flex items-center justify-center border border-success-start/30">
                        <CheckCircle className="w-8 h-8 text-success-start" />
                    </div>
                    <h1 className="text-2xl font-black text-text-primary mb-2 uppercase tracking-tighter">
                        {t('resetPassword.success', 'Fjalëkalimi u Rivendos')}
                    </h1>
                    <p className="text-text-secondary mb-6">
                        {t('resetPassword.successMessage', 'Fjalëkalimi juaj është ndryshuar me sukses. Tani mund të hyni në llogarinë tuaj.')}
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="btn-primary w-full py-3 rounded-xl hover-lift shadow-sm"
                    >
                        {t('resetPassword.loginNow', 'Hyni Tani')}
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel max-w-md w-full p-8 rounded-2xl border border-border-main shadow-sm"
            >
                <button
                    onClick={() => navigate('/login')}
                    className="mb-6 flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm"
                >
                    <ArrowLeft size={16} />
                    {t('general.back', 'Kthehu')}
                </button>

                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-start/10 flex items-center justify-center border border-primary-start/20">
                        <KeyRound className="w-8 h-8 text-primary-start" />
                    </div>
                    <h1 className="text-2xl font-black text-text-primary mb-2 uppercase tracking-tighter">
                        {t('resetPassword.title', 'Rivendos Fjalëkalimin')}
                    </h1>
                    <p className="text-text-secondary text-sm">
                        {t('resetPassword.description', 'Shkruani fjalëkalimin tuaj të ri.')}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-danger-start/10 border border-danger-start/30 rounded-xl p-3 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-danger-start shrink-0" />
                            <p className="text-danger-start text-sm">{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-1">
                            {t('resetPassword.newPassword', 'Fjalëkalimi i Ri')}
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="glass-input w-full pl-10 bg-canvas border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all"
                                disabled={isLoading}
                            />
                        </div>
                        <p className="text-xs text-text-muted mt-1">
                            {t('resetPassword.passwordHint', 'Minimumi 8 karaktere')}
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-1">
                            {t('resetPassword.confirmPassword', 'Konfirmo Fjalëkalimin')}
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="glass-input w-full pl-10 bg-canvas border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary w-full py-3 rounded-xl hover-lift shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                        ) : (
                            t('resetPassword.resetButton', 'Rivendos Fjalëkalimin')
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default ResetPasswordPage;