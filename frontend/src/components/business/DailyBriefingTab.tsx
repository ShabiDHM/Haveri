// FILE: src/components/business/DailyBriefingTab.tsx
// PHOENIX PROTOCOL - DASHBOARD INTEGRATION V4.2 (ARGUMENT FIX)
// 1. FIX: Provided the required 'INBOX' argument to 'getInboundMessages' to resolve the TypeScript error.
// 2. LOGIC: Ensures the message count on the dashboard specifically reflects unread inbox messages.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, Target, AlertTriangle, Mail, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStrategicBriefing, UIAgendaItem } from '../../hooks/useStrategicBriefing';
import { useFinanceData } from '../../hooks/useFinanceData';
import { EventDetailModal } from '../modals/EventDetailModal';
import { apiService } from '../../services/api';
import { Case } from '../../data/types';

import { BusinessRhythmCard } from './briefing/BusinessRhythmCard';
import { BusinessPulseCard } from './briefing/BusinessPulseCard';
import { SmartAgendaCard } from './briefing/SmartAgendaCard';

export const DailyBriefingTab: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    
    const { data: briefingData, loading: briefingLoading, error: briefingError, refreshData } = useStrategicBriefing();
    const { displayIncome, loading: financeLoading } = useFinanceData();

    const [selectedEvent, setSelectedEvent] = useState<UIAgendaItem | null>(null);
    const [cases, setCases] = useState<Case[]>([]);
    const [messageCount, setMessageCount] = useState(0);

    const months = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];
    const today = new Date();
    const finalDate = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
    
    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch Cases
                const casesData = await apiService.getCases();
                setCases(casesData);
                
                // PHOENIX: Pass 'INBOX' to get the correct count for the widget
                const msgs = await apiService.getInboundMessages('INBOX');
                setMessageCount(msgs.length);
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            }
        };
        loadData();
    }, []);

    const handleEventUpdate = () => {
        if(refreshData) refreshData();
    };

    const isLoading = briefingLoading || financeLoading;

    if (isLoading) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>;
    if (briefingError) return <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center"><AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" /><h3 className="text-white font-bold">{t('error.generic')}</h3><p>{t('error.failedToLoad')}</p></div>;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 pb-10">
            <AnimatePresence>
                {selectedEvent && (
                    <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onUpdate={handleEventUpdate} cases={cases} />
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-fr">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    <BusinessRhythmCard currentSales={displayIncome} /> 
                </motion.div>
                
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                    <BusinessPulseCard signals={briefingData?.market.signals} currentSales={displayIncome} />
                </motion.div>
                
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="flex flex-col gap-4">
                    
                    {/* New Messages Widget */}
                    <div 
                        onClick={() => navigate('/business/inbox')}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white flex justify-between items-center cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all border border-blue-400/20"
                    >
                        <div>
                            <div className="flex items-center gap-2 text-xs opacity-90 uppercase font-bold tracking-widest mb-1">
                                <Mail size={14} /> Inbox
                            </div>
                            <div className="text-2xl font-black">{messageCount} <span className="text-sm font-normal opacity-80">mesazhe</span></div>
                        </div>
                        <div className="bg-white/20 p-2 rounded-lg">
                            <ArrowRight size={20} />
                        </div>
                    </div>

                    {/* Existing Agenda Card */}
                    <div className="flex-1 min-h-0">
                        {briefingData && <SmartAgendaCard agenda={briefingData.agenda} onEventClick={(event) => setSelectedEvent(event)} />}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};