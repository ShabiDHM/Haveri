// FILE: src/pages/IntegrationsPage.tsx
// PHOENIX PROTOCOL - I18N V4.0 (DESIGN SYSTEM STANDARDIZED)
// STATUS: VERIFIED - COMPLETE FILE REPLACEMENT

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Share2 } from 'lucide-react';
import { EmailIngestCard } from '../components/EmailIngestCard';

export const IntegrationsPage: React.FC = () => {
    const { t } = useTranslation();

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 md:p-8 space-y-6"
        >
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <Share2 className="text-primary" size={32}/>
                    <h1 className="text-3xl font-bold text-text-primary tracking-tight">
                        {t('settings.integrations.title')}
                    </h1>
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-text-muted">
                    {t('settings.integrations.subtitle')}
                </p>
            </div>

            <div className="space-y-8">
                <EmailIngestCard />
            </div>
        </motion.div>
    );
};
