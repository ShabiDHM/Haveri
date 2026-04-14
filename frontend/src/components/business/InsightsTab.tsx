// FILE: src/components/business/InsightsTab.tsx
// PHOENIX PROTOCOL – SEMANTIC PRIMARY ALIASES

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
import { EventDetailModal, UIAgendaItem } from '../modals/EventDetailModal';

export const InsightsTab: React.FC = () => {
    const { t } = useTranslation();
    const { workspace } = useAuth();

    const [showAnalystPanel, setShowAnalystPanel] = useState(false);
    const [showForensicModal, setShowForensicModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<UIAgendaItem | null>(null);

    const { loading: intelLoading, profitAnalytics, taxAnalytics } = useBusinessIntelligence(workspace?.id);
    const { loading: financeLoading } = useFinanceData({ workspaceId: workspace?.id });
    const { data: briefingData, loading: briefingLoading, refreshData } = useStrategicBriefing(workspace?.id);

    const handleEventClick = (event: any) => {
        const uiEvent: UIAgendaItem = {
            id: event.id,
            title: event.title,
            time: event.time,
            type: event.type,
            priority: event.priority,
            isCompleted: false,
            kind: event.type === 'TASK' ? 'task' : 'event',
            raw: event.raw || {
                id: event.id,
                title: event.title,
                start_date: event.date || new Date().toISOString(),
                event_type: event.type,
                priority: event.priority,
                description: '',
                location: '',
                notes: '',
                is_all_day: false,
                status: 'PENDING'
            }
        };
        setSelectedEvent(uiEvent);
    };

    const handleModalClose = () => {
        setSelectedEvent(null);
        refreshData();
    };

    const loading = intelLoading || financeLoading || briefingLoading;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Top Analysis Header */}
            <div className="glass-panel p-6 sm:p-8 border border-border-main shadow-sm">
                <div className="flex items-center justify-between border-b border-border-main pb-5 flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <FileSpreadsheet className="text-primary" size={20} />
                        <h2 className="text-sm font-black text-text-primary uppercase tracking-widest leading-none">
                            {t('analyst.smartDataAnalystTitle', 'Analisti i të Dhënave')}
                        </h2>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowAnalystPanel(!showAnalystPanel)}
                            className="glass-input px-4 py-2.5 flex items-center gap-2 text-xs uppercase font-black tracking-widest transition-colors hover:bg-hover rounded-lg border border-border-main hover:border-primary/50 hover-lift shadow-sm"
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

            {/* Three‑column grid with equal height */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                {briefingData && (
                    <SmartAgendaCard 
                        agenda={briefingData.agenda} 
                        onEventClick={handleEventClick}
                    />
                )}
                <TaxModule data={taxAnalytics} />
                <StockModule data={profitAnalytics} />
            </div>

            <AnimatePresence>
                {selectedEvent && (
                    <EventDetailModal 
                        event={selectedEvent} 
                        onClose={handleModalClose}
                        onUpdate={refreshData}
                        workspaces={[]}
                    />
                )}
            </AnimatePresence>

            <ForensicAccountantModal
                isOpen={showForensicModal}
                onClose={() => setShowForensicModal(false)}
                workspaceId={workspace?.id}
            />
        </div>
    );
};