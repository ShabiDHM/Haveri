// FILE: src/pages/ForgotPasswordPage.tsx
// PHOENIX PROTOCOL - FORGOT PASSWORD PAGE V1.0

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';

const ForgotPasswordPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError(t('forgotPassword.emailRequired', 'Ju lutemi shkruani email-in tuaj.'));
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            await apiService.forgotPassword(email);
            setSuccess(true);
        } catch (err: any) {
            console.error('Forgot password error:', err);
            const errorMessage = err.response?.data?.detail || t('forgotPassword.error', 'Ndodhi një gabim. Ju lutemi provoni përsëri.');
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

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
                        {t('forgotPassword.emailSent', 'Email-i u dërgua')}
                    </h1>
                    <p className="text-text-secondary mb-6">
                        {t('forgotPassword.checkEmail', 'Ne kemi dërguar një link për rivendosjen e fjalëkalimit në adresën tuaj të email-it.')}
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="btn-primary w-full py-3 rounded-xl hover-lift shadow-sm"
                    >
                        {t('forgotPassword.backToLogin', 'Kthehu te Hyrja')}
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
                        <Mail className="w-8 h-8 text-primary-start" />
                    </div>
                    <h1 className="text-2xl font-black text-text-primary mb-2 uppercase tracking-tighter">
                        {t('forgotPassword.title', 'Rivendos Fjalëkalimin')}
                    </h1>
                    <p className="text-text-secondary text-sm">
                        {t('forgotPassword.description', 'Shkruani email-in tuaj dhe ne do t\'ju dërgojmë një link për të rivendosur fjalëkalimin.')}
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
                            {t('login.email', 'Email')}
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ju@email.com"
                            className="glass-input w-full bg-canvas border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all"
                            disabled={isLoading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary w-full py-3 rounded-xl hover-lift shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                        ) : (
                            t('forgotPassword.sendLink', 'Dërgo Linkun')
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link to="/login" className="text-xs text-text-muted hover:text-primary-start transition-colors">
                        {t('login.backToLogin', 'Kujtuat fjalëkalimin? Hyni')}
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default ForgotPasswordPage;