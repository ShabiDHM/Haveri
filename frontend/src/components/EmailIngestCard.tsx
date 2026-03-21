// FILE: src/components/EmailIngestCard.tsx
// PHOENIX PROTOCOL - I18N V2.0 (DESIGN SYSTEM ALIGNMENT)
// 1. REFACTOR: Replaced all hardcoded strings with i18next 't()' function calls.
// 2. UPDATED: Uses new design system CSS variables for light/dark theme compatibility.
// 3. INTEGRITY: Component is now fully translatable and adheres to project architecture.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Copy, Check, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const EmailIngestCard: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [inboundEmail, setInboundEmail] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (user && (user as any).inbound_email_token) {
            setInboundEmail(`${(user as any).inbound_email_token}@in.haveri.tech`);
        }
    }, [user]);

    const handleCopy = () => {
        if (inboundEmail) {
            navigator.clipboard.writeText(inboundEmail);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="card-panel p-6 shadow-lg">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                    <Mail size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-text-primary">{t('settings.integrations.emailIngest.title')}</h2>
                    <p className="text-sm text-text-secondary">{t('settings.integrations.emailIngest.subtitle')}</p>
                </div>
            </div>

            <div className="bg-surface rounded-lg p-4 border border-border-main mb-6">
                 <div className="flex items-center gap-2 mb-2">
                    <Info size={14} className="text-primary" />
                    <span className="text-sm font-medium text-text-secondary">{t('settings.integrations.emailIngest.yourAddress')}</span>
                </div>
                
                {inboundEmail ? (
                    <div className="flex items-center justify-between gap-4 bg-card p-3 rounded-lg border border-border-main">
                        <code className="text-base font-mono text-success-start truncate">{inboundEmail}</code>
                        <button 
                            onClick={handleCopy}
                            className="p-2 rounded-lg bg-surface hover:bg-hover text-text-secondary transition-colors"
                            title={t('settings.integrations.emailIngest.copy')}
                        >
                            {copied ? <Check size={16} className="text-success-start" /> : <Copy size={16} />}
                        </button>
                    </div>
                ) : (
                    <p className="text-text-muted">{t('settings.integrations.emailIngest.loading')}</p>
                )}
            </div>

            <div>
                <h3 className="text-base font-bold text-text-primary mb-2">{t('settings.integrations.emailIngest.setupTitle')}</h3>
                <ul className="space-y-3 text-sm text-text-secondary list-decimal list-inside">
                    <li>{t('settings.integrations.emailIngest.step1')}</li>
                    <li>{t('settings.integrations.emailIngest.step2')}</li>
                    <li>{t('settings.integrations.emailIngest.step3')}</li>
                    <li>{t('settings.integrations.emailIngest.step4')}</li>
                </ul>
            </div>
        </div>
    );
};