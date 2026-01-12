// FILE: src/pages/IntegrationsPage.tsx
// PHOENIX PROTOCOL - INTEGRATIONS PAGE V1.1
// 1. FEATURE: A new settings page for managing integrations.
// 2. LAYOUT: Provides a container for the Email Ingest card and future integrations.

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Share2 } from 'lucide-react';
import { EmailIngestCard } from '../components/EmailIngestCard'; // Corrected Path

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
                    <h1 className="text-3xl font-bold text-white tracking-tight">{t('settings.integrations.title', 'Integrimet & Automatizimi')}</h1>
                </div>
                <p className="text-lg text-gray-400">{t('settings.integrations.subtitle', 'Lidhni shërbimet tjera dhe automatizoni proceset e punës.')}</p>
            </div>

            <div className="space-y-8">
                <EmailIngestCard />
                {/* Future integration cards can be added here */}
            </div>
        </motion.div>
    );
};