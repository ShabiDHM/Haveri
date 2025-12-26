// FILE: src/components/business/DailyBriefingTab.tsx
// PHOENIX PROTOCOL - STRATEGIC BRIEFING V18.1
// 1. CONFIRMED: All paths and hooks are correct for the new backend.
// 2. STATUS: Production Ready.

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { useStrategicBriefing } from '../../hooks/useStrategicBriefing';

// Modules
import { DealRiskAnalyzerCard } from './briefing/DealRiskAnalyzerCard';
import { ProfitOptimizerCard } from './briefing/ProfitOptimizerCard';
import { SmartAgendaCard } from './briefing/SmartAgendaCard';

export const DailyBriefingTab: React.FC = () => {
    const { t } = useTranslation();
    const { data, loading, error } = useStrategicBriefing();

    if (loading) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-primary-start" /></div>;
    if (error || !data) return <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center"><AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" /><h3 className="text-white font-bold">{t('error.generic')}</h3><p className="text-gray-400 text-sm mt-1">{t('error.failedToLoad')}</p></div>;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 pb-10">
            
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-white/10 p-6 sm:p-10 text-center sm:text-left">
                <div className="absolute top-0 right-0 p-32 bg-primary-start/20 blur-[100px] rounded-full pointer-events-none" />
                <div className="relative z-10">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight flex items-center justify-center sm:justify-start gap-3">
                        <Sparkles className="text-amber-400 fill-amber-400" /> {t('briefing.title', 'Përmbledhja Strategjike')}
                    </h2>
                    <p className="text-gray-300 text-lg max-w-2xl">
                        {t('briefing.subtitle', 'Misionet tuaja ditore, gjeneruar nga Këshilltari juaj AI.')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <DealRiskAnalyzerCard initialData={data.dealRiskAnalyzer} />
                </motion.div>
                
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <ProfitOptimizerCard memo={data.profitOptimizer} />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <SmartAgendaCard agenda={data.smartAgenda} />
                </motion.div>
            </div>
        </motion.div>
    );
};