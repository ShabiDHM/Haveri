// FILE: src/pages/IntegrationsPage.tsx
// PHOENIX PROTOCOL - INTEGRATIONS PAGE V4.2 (CONSISTENT STYLING)

import React, { useState } from 'react';
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
        console.log('Import completed');
    };

    return (
        <div className="flex flex-col min-h-screen bg-base text-text-primary">
            <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 pb-24">
                <div className="glass-panel p-5 sm:p-6 md:p-8 flex flex-col border border-border-main shadow-sm">
                    
                    {/* Header - Consistent with Stoku tab */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-border-main shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary-start/10 rounded-xl border border-border-main">
                                <Share2 className="text-primary-start" size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-text-primary tracking-tight uppercase">
                                    {t('settings.integrations.title', 'Integrimet')}
                                </h1>
                                <p className="text-xs font-black uppercase tracking-widest text-text-muted mt-1">
                                    {t('settings.integrations.subtitle', 'Lidhni dhe integroni sistemet e jashtme')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Import Cards - Consistent with Stoku card styling */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                        <div
                            onClick={() => setShowImportModal(true)}
                            className="group cursor-pointer bg-surface/30 backdrop-blur-sm border border-border-main rounded-2xl p-6 hover:border-primary-start/50 transition-all hover-lift shadow-sm"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-xl bg-primary-start/10 text-primary-start border border-border-main">
                                    <Upload size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-text-primary group-hover:text-primary-start transition-colors">
                                    {t('integrations.importTransactions', 'Importo Transaksione')}
                                </h3>
                            </div>
                            <p className="text-text-muted text-sm leading-relaxed">
                                {t('integrations.importTransactionsDesc', 'Ngarkoni skedarë Excel, CSV ose imazhe për të importuar transaksione financiare.')}
                            </p>
                        </div>

                        <div
                            onClick={() => setShowClientImportModal(true)}
                            className="group cursor-pointer bg-surface/30 backdrop-blur-sm border border-border-main rounded-2xl p-6 hover:border-primary-start/50 transition-all hover-lift shadow-sm"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-xl bg-primary-start/10 text-primary-start border border-border-main">
                                    <Users size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-text-primary group-hover:text-primary-start transition-colors">
                                    {t('integrations.importClients', 'Importo Klientët')}
                                </h3>
                            </div>
                            <p className="text-text-muted text-sm leading-relaxed">
                                {t('integrations.importClientsDesc', 'Importoni lista klientësh nga skedarë CSV ose Excel.')}
                            </p>
                        </div>
                    </div>

                    {/* Email Ingest Card - Consistent styling */}
                    <div className="mt-6">
                        <EmailIngestCard />
                    </div>
                </div>
            </div>

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
        </div>
    );
};