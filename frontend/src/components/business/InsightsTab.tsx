// FILE: src/components/business/InsightsTab.tsx
// PHOENIX PROTOCOL - INSIGHTS UI V5.7 (FINAL CLEANUP - REMOVED FORENSIC UI, RENAMED ANALYZER)

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react';
import { useBusinessIntelligence } from '../../hooks/useBusinessIntelligence';
import { useFinanceData } from '../../hooks/useFinanceData';
import { useStrategicBriefing } from '../../hooks/useStrategicBriefing';
import { useAuth } from '../../context/AuthContext';

import { TaxModule } from './insights/TaxModule';
import { StockModule } from './insights/StockModule';
import { SmartAgendaCard } from './insights/SmartAgendaCard';
import SpreadsheetAnalysisPanel from '../SpreadsheetAnalysisPanel';
import { ForensicAccountantModal } from './insights/ForensicAccountantModal';

export const InsightsTab: React.FC = () => {
    const { t } = useTranslation();
    const { workspace } = useAuth();

    // Data fetching hooks
    const { loading: intelLoading, profitAnalytics, taxAnalytics } = useBusinessIntelligence(workspace?.id);
    const { loading: financeLoading } = useFinanceData({ workspaceId: workspace?.id });
    const { data: briefingData, loading: briefingLoading } = useStrategicBriefing(workspace?.id);

    // UI State
    const [showAnalystPanel, setShowAnalystPanel] = useState(false);
    const [showForensicModal, setShowForensicModal] = useState(false);

    const loading = intelLoading || financeLoading || briefingLoading;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="w-12 h-12 animate-spin text-primary-start" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Top Analysis Header */}
            <div className="glass-panel p-6 sm:p-8 border border-border-main shadow-sm">
                <div className="flex items-center justify-between border-b border-border-main pb-5 flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <FileSpreadsheet className="text-primary-start" size={20} />
                        <h2 className="text-sm font-black text-text-primary uppercase tracking-widest leading-none">
                            {t('analyst.smartDataAnalystTitle', 'Analisti i të Dhënave')}
                        </h2>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowAnalystPanel(!showAnalystPanel)}
                            className="glass-input px-4 py-2.5 flex items-center gap-2 text-xs uppercase font-black tracking-widest transition-colors hover:bg-hover rounded-lg border border-border-main hover:border-primary-start/50 hover-lift shadow-sm"
                        >
                            {showAnalystPanel ? (
                                <><ChevronUp size={14} /> {t('insights.hideAnalysis', 'Fshih Analizën')}</>
                            ) : (
                                <><ChevronDown size={14} /> {t('insights.showAnalysis', 'Analizo Excel/CSV')}</>
                            )}
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {showAnalystPanel && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden pt-6"
                        >
                            <SpreadsheetAnalysisPanel />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Dashboard Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {briefingData && <SmartAgendaCard agenda={briefingData.agenda} />}
                <TaxModule data={taxAnalytics} />
                <StockModule data={profitAnalytics} />
            </div>

            {/* Forensic Modal logic preserved for backend functionality, just hidden from UI header */}
            <ForensicAccountantModal
                isOpen={showForensicModal}
                onClose={() => setShowForensicModal(false)}
                workspaceId={workspace?.id}
            />
        </div>
    );
};