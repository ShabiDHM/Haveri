// FILE: src/pages/IntegrationsPage.tsx
// PHOENIX PROTOCOL - I18N V4.1 (ADD IMPORT MODALS)

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Share2, Upload, Users } from 'lucide-react';
import { EmailIngestCard } from '../components/EmailIngestCard';
import { TransactionImporter } from '../components/business/TransactionImporter';
import { ClientImportModal } from '../components/business/modals/ClientImportModal';

export const IntegrationsPage: React.FC = () => {
    const { t } = useTranslation();
    const [showImportModal, setShowImportModal] = useState(false);
    const [showClientImportModal, setShowClientImportModal] = useState(false);

    const refreshData = () => {
        // Optional: refresh any data after import
        console.log('Import completed');
    };

    return (
        <>
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

                {/* Import Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div
                        onClick={() => setShowImportModal(true)}
                        className="group cursor-pointer bg-surface/30 backdrop-blur-sm border border-border-main rounded-2xl p-6 hover:border-primary-start/50 transition-all hover-lift shadow-sm"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-primary-start/10 text-primary-start">
                                <Upload size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-text-primary group-hover:text-primary-start transition-colors">
                                {t('integrations.importTransactions', 'Importo Transaksione')}
                            </h3>
                        </div>
                        <p className="text-text-muted text-sm">
                            {t('integrations.importTransactionsDesc', 'Ngarkoni skedarë Excel, CSV ose imazhe për të importuar transaksione financiare.')}
                        </p>
                    </div>

                    <div
                        onClick={() => setShowClientImportModal(true)}
                        className="group cursor-pointer bg-surface/30 backdrop-blur-sm border border-border-main rounded-2xl p-6 hover:border-primary-start/50 transition-all hover-lift shadow-sm"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-primary-start/10 text-primary-start">
                                <Users size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-text-primary group-hover:text-primary-start transition-colors">
                                {t('integrations.importClients', 'Importo Klientët')}
                            </h3>
                        </div>
                        <p className="text-text-muted text-sm">
                            {t('integrations.importClientsDesc', 'Importoni lista klientësh nga skedarë CSV ose Excel.')}
                        </p>
                    </div>
                </div>

                <div className="space-y-8">
                    <EmailIngestCard />
                </div>
            </motion.div>

            {/* Modals */}
            {showImportModal && (
                <TransactionImporter
                    onClose={() => setShowImportModal(false)}
                    onSuccess={() => {
                        refreshData();
                        setShowImportModal(false);
                    }}
                    t={t}
                />
            )}
            {showClientImportModal && (
                <ClientImportModal
                    isOpen={showClientImportModal}
                    onClose={() => setShowClientImportModal(false)}
                    onSuccess={() => {
                        refreshData();
                        setShowClientImportModal(false);
                    }}
                />
            )}
        </>
    );
};