// FILE: src/components/business/InsightsTab.tsx
// PHOENIX PROTOCOL - INSIGHTS UI V4.3 (TRANSFORMER APPLIED)

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, FileSpreadsheet, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBusinessIntelligence } from '../../hooks/useBusinessIntelligence';
import { useFinanceData } from '../../hooks/useFinanceData';
import { useStrategicBriefing } from '../../hooks/useStrategicBriefing';
import { useAuth } from '../../context/AuthContext';
import { Panel } from '../ui/Panel';

// Modules
import { DebtModule } from './insights/DebtModule';
import { TaxModule } from './insights/TaxModule';
import { ProfitModule } from './insights/ProfitModule';
import { BusinessRhythmCard, DailySalesData } from './briefing/BusinessRhythmCard';
import { BusinessPulseCard } from './briefing/BusinessPulseCard';
import { SmartAgendaCard } from './briefing/SmartAgendaCard';
import SpreadsheetAnalysisPanel from '../SpreadsheetAnalysisPanel';

export const InsightsTab: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    useAuth();
    
    const { loading: intelLoading, debtAnalytics, profitAnalytics, taxAnalytics } = useBusinessIntelligence();
    const { displayIncome, analyticsData, loading: financeLoading } = useFinanceData();
    const { data: briefingData, loading: briefingLoading } = useStrategicBriefing();
    
    const [showAnalystPanel, setShowAnalystPanel] = useState(false);

    // Transform raw trend data into the format expected by BusinessRhythmCard
    const salesHistory: DailySalesData = useMemo(() => {
        if (!analyticsData?.sales_trend) return { labels: [], data: [] };
        return {
            labels: analyticsData.sales_trend.map((p: any) => p.date),
            data: analyticsData.sales_trend.map((p: any) => p.amount)
        };
    }, [analyticsData]);

    const loading = intelLoading || financeLoading || briefingLoading;

    if (loading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-8">
            <Panel className="p-5 border-top-accent border-t-primary relative">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl"><FileSpreadsheet className="text-primary" size={24} /></div>
                        <div>
                            <h2 className="text-lg font-bold text-text-primary">{t('analyst.smartDataAnalystTitle', 'Analisti i të Dhënave')}</h2>
                            <p className="text-sm text-text-muted">{t('analyst.description', 'Merrni analiza të thelluara të të dhënave Excel.')}</p>
                        </div>
                    </div>
                    <button onClick={() => setShowAnalystPanel(!showAnalystPanel)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-hover border border-border-strong transition-all">
                        {showAnalystPanel ? <><ChevronUp size={18} /> {t('insights.hideAnalysis', 'Fshih Analizën')}</> : <><ChevronDown size={18} /> {t('insights.showAnalysis', 'Hap Analizën')}</>}
                    </button>
                </div>
            </Panel>

            <AnimatePresence>
                {showAnalystPanel && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <SpreadsheetAnalysisPanel />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <BusinessRhythmCard currentSales={displayIncome} salesHistory={salesHistory} />
                <BusinessPulseCard signals={briefingData?.market.signals} currentSales={displayIncome} />
                
                <div className="flex flex-col gap-6">
                     <div onClick={() => navigate('/business/inbox')} className="group bg-card border border-border-strong rounded-3xl p-6 cursor-pointer hover:border-primary/30 transition-all shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-primary/20 text-primary border border-primary/20"><Mail size={20} /></div>
                            <div><h3 className="font-bold text-lg">Inbox</h3><p className="text-sm text-text-muted">Mesazhe të reja</p></div>
                        </div>
                     </div>
                     {briefingData && <SmartAgendaCard agenda={briefingData.agenda} />}
                </div>
                
                <DebtModule data={debtAnalytics} />
                <TaxModule data={taxAnalytics} />
                <ProfitModule data={profitAnalytics} />
            </div>
        </div>
    );
};