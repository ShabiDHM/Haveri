// FILE: src/components/business/DailyBriefingTab.tsx
// PHOENIX PROTOCOL - PROP COMPLETION V1.0
// 1. DATA: Added state and useEffect to fetch 'cases'.
// 2. FIX: Passed the required 'cases' prop to EventDetailModal.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, Target, AlertTriangle } from 'lucide-react';
import { useStrategicBriefing, UIAgendaItem } from '../../hooks/useStrategicBriefing';
import { EventDetailModal } from '../modals/EventDetailModal';
import { apiService } from '../../services/api';
import { Case } from '../../data/types';

// Imports
import { BusinessRhythmCard } from './briefing/BusinessRhythmCard';
import { ProductPerformanceCard } from './briefing/ProductPerformanceCard';
import { SmartAgendaCard } from './briefing/SmartAgendaCard';

export const DailyBriefingTab: React.FC = () => {
    const { t } = useTranslation();
    const { data, loading, error, refreshData } = useStrategicBriefing();
    const [selectedEvent, setSelectedEvent] = useState<UIAgendaItem | null>(null);
    const [cases, setCases] = useState<Case[]>([]); // PHOENIX: Added cases state

    const months = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];
    const today = new Date();
    const day = today.getDate();
    const month = months[today.getMonth()];
    const year = today.getFullYear();
    const finalDate = `${day} ${month} ${year}`;
    
    // PHOENIX: Fetch cases to pass to the modal
    useEffect(() => {
        const loadCases = async () => {
            try {
                const casesData = await apiService.getCases();
                setCases(casesData);
            } catch (err) {
                console.error("Failed to load cases for modal context", err);
            }
        };
        loadCases();
    }, []);

    const handleEventUpdate = () => {
        if(refreshData) refreshData();
    };

    if (loading) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>;
    if (error) return <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center"><AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" /><h3 className="text-white font-bold">{t('error.generic')}</h3><p>{t('error.failedToLoad')}</p></div>;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 pb-10">
            <AnimatePresence>
                {selectedEvent && (
                    <EventDetailModal
                        event={selectedEvent}
                        onClose={() => setSelectedEvent(null)}
                        onUpdate={handleEventUpdate}
                        cases={cases} // PHOENIX: Passed cases prop
                    />
                )}
            </AnimatePresence>
            
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 to-slate-900 border border-white/10 p-6 sm:p-10 text-center sm:text-left shadow-2xl">
                <div className="absolute top-0 right-0 p-40 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight flex items-center justify-center sm:justify-start gap-3"><Target className="text-indigo-400" />{t('dashboard.dailyOverviewTitle')}</h2>
                        <p className="text-gray-400 text-lg max-w-xl">{t('dashboard.dailyOverviewSubtitle')}</p>
                    </div>
                    <div className="hidden sm:block text-right">
                        <div className="text-sm text-gray-500 uppercase tracking-widest font-semibold">{t('common.today')}</div>
                        <div className="text-2xl text-white font-mono font-bold tracking-tight">{finalDate}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}><BusinessRhythmCard /></motion.div>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}><ProductPerformanceCard /></motion.div>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                    {data && <SmartAgendaCard agenda={data.agenda} onEventClick={(event) => setSelectedEvent(event)} />}
                </motion.div>
            </div>
        </motion.div>
    );
};