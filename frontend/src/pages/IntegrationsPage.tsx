// FILE: src/pages/IntegrationsPage.tsx
// PHOENIX PROTOCOL - I18N V1.2
// 1. REFACTOR: Replaced hardcoded title and subtitle with i18next 't()' function calls.

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
            className="p-4 sm:p-8 max-w-4xl mx-auto"
        >
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Share2 className="text-blue-400" size={32}/>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{t('settings.integrations.title')}</h1>
                </div>
                <p className="text-lg text-gray-400">{t('settings.integrations.subtitle')}</p>
            </div>

            <div className="space-y-8">
                <EmailIngestCard />
            </div>
        </motion.div>
    );
};