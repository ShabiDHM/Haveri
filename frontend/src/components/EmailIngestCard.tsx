// FILE: src/components/EmailIngestCard.tsx
// PHOENIX PROTOCOL - PATH CORRECTION V1.1
// 1. CRITICAL FIX: Corrected the import path for AuthContext to resolve the build error.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Copy, Check, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; // PHOENIX: Corrected Path

export const EmailIngestCard: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [inboundEmail, setInboundEmail] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (user && (user as any).inbound_email_token) {
            // Replace 'in.haveri.tech' with your actual inbound domain.
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
        <div className="bg-gray-900/50 border border-white/10 rounded-3xl p-6 shadow-lg">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Mail size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">{t('settings.integrations.emailIngest.title', 'Automatizimi me Email')}</h2>
                    <p className="text-sm text-gray-400">{t('settings.integrations.emailIngest.subtitle', 'Dërgoni raportet ditore automatikisht.')}</p>
                </div>
            </div>

            <div className="bg-black/40 rounded-lg p-4 border border-white/10 mb-6">
                 <div className="flex items-center gap-2 mb-2">
                    <Info size={14} className="text-blue-400" />
                    <span className="text-sm font-medium text-gray-300">{t('settings.integrations.emailIngest.yourAddress', 'Adresa Juaj Unike')}</span>
                </div>
                
                {inboundEmail ? (
                    <div className="flex items-center justify-between gap-4 bg-gray-900 p-3 rounded-lg">
                        <code className="text-base font-mono text-emerald-400 truncate">{inboundEmail}</code>
                        <button 
                            onClick={handleCopy}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                            title={t('settings.integrations.emailIngest.copy', 'Kopjo')}
                        >
                            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                        </button>
                    </div>
                ) : (
                    <p className="text-gray-500">{t('settings.integrations.emailIngest.loading', 'Duke ngarkuar adresën...')}</p>
                )}
            </div>

            <div>
                <h3 className="text-base font-bold text-gray-200 mb-2">{t('settings.integrations.emailIngest.setupTitle', 'Udhëzime')}</h3>
                <ul className="space-y-3 text-sm text-gray-400 list-decimal list-inside">
                    <li>{t('settings.integrations.emailIngest.step1', 'Hyni në panelin e POS sistemit tuaj.')}</li>
                    <li>{t('settings.integrations.emailIngest.step2', 'Gjeni seksionin për raporte ditore automatike (Daily Reports / Z Report).')}</li>
                    <li>{t('settings.integrations.emailIngest.step3', 'Vendosni adresën tuaj unike si pranues (recipient) i raportit.')}</li>
                    <li>{t('settings.integrations.emailIngest.step4', 'Sigurohuni që raporti të dërgohet si skedar .CSV ose .XLSX.')}</li>
                </ul>
            </div>
        </div>
    );
};