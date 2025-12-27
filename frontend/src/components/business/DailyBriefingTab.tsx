import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, Target, AlertTriangle } from 'lucide-react';
import { useStrategicBriefing } from '../../hooks/useStrategicBriefing';

// Corrected Imports for the New Architecture
import { BusinessRhythmCard } from './briefing/BusinessRhythmCard';
import { ExternalFactorsCard } from './briefing/ExternalFactorsCard';
import { SmartAgendaCard } from './briefing/SmartAgendaCard';

export const DailyBriefingTab: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { data, loading, error } = useStrategicBriefing();

    // Dynamic Date Formatting
    const today = new Date();
    const dateFormatted = today.toLocaleDateString(i18n.language || 'sq-AL', { day: 'numeric', month: 'short' }).toUpperCase();

    if (loading) return (
        <div className="flex justify-center h-96 items-center">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
        </div>
    );
    
    if (error) return (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-white font-bold">{t('error.generic', 'Diçka shkoi keq')}</h3>
            <p className="text-gray-400 text-sm mt-1">{t('error.failedToLoad', 'Nuk mundëm të ngarkojmë të dhënat strategjike.')}</p>
        </div>
    );

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-6 sm:space-y-8 pb-10"
        >
            
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 to-slate-900 border border-white/10 p-6 sm:p-10 text-center sm:text-left shadow-2xl">
                <div className="absolute top-0 right-0 p-40 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight flex items-center justify-center sm:justify-start gap-3">
                            <Target className="text-indigo-400 fill-indigo-400/20" /> 
                            {t('dashboard.businessCenterTitle', 'Qendra e Biznesit')}
                        </h2>
                        <p className="text-gray-400 text-lg max-w-xl">
                            {t('dashboard.businessCenterSubtitle', 'Pasqyra e operacioneve dhe rekomandimet ditore.')}
                        </p>
                    </div>
                    {/* Date Badge */}
                    <div className="hidden sm:block text-right">
                        <div className="text-sm text-gray-500 uppercase tracking-widest font-semibold">{t('common.today', 'SOT')}</div>
                        <div className="text-2xl text-white font-mono">{dateFormatted}</div>
                    </div>
                </div>
            </div>

            {/* The New Innovative Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Ritmi i Biznesit (Sales Velocity) - Corrected Import Usage */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    <BusinessRhythmCard />
                </motion.div>
                
                {/* 2. Faktorët e Jashtëm (Context Intelligence) - Corrected Import Usage */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                    <ExternalFactorsCard />
                </motion.div>

                {/* 3. Smart Agenda (Existing Logic) */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                    {data && <SmartAgendaCard agenda={data.agenda} />}
                </motion.div>
            </div>
            
        </motion.div>
    );
};