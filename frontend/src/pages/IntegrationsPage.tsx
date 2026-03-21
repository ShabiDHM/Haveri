// FILE: src/pages/IntegrationsPage.tsx
// PHOENIX PROTOCOL - I18N V2.0 (DESIGN SYSTEM ALIGNMENT)
// 1. REFACTOR: Replaced hardcoded title and subtitle with i18next 't()' function calls.
// 2. UPDATED: Uses new design system CSS variables for light/dark theme compatibility.

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
                    <Share2 className="text-primary" size={32}/>
                    <h1 className="text-3xl font-bold text-text-primary tracking-tight">{t('settings.integrations.title')}</h1>
                </div>
                <p className="text-lg text-text-secondary">{t('settings.integrations.subtitle')}</p>
            </div>

            <div className="space-y-8">
                <EmailIngestCard />
            </div>
        </motion.div>
    );
};