// FILE: src/components/business/DailyBriefingTab.tsx
// PHOENIX PROTOCOL - DASHBOARD V5.4 (DETERMINISTIC LOCALIZATION)
// 1. FIXED: Implemented manual short month mapping to ensure Albanian dates on Desktop.
// 2. REASON: Bypasses non-deterministic browser behavior for toLocaleDateString.
// 3. STATUS: Fully synchronized.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, Target, AlertTriangle, Mail, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useStrategicBriefing } from '../../hooks/useStrategicBriefing';
import { useFinanceData } from '../../hooks/useFinanceData';
import { EventDetailModal } from '../modals/EventDetailModal';
import { apiService } from '../../services/api';
import { Workspace, UIAgendaItem } from '../../data/types'; 

import { BusinessRhythmCard, DailySalesData } from './briefing/BusinessRhythmCard';
import { BusinessPulseCard } from './briefing/BusinessPulseCard';
import { SmartAgendaCard } from './briefing/SmartAgendaCard';

interface RawTransaction {
    date?: string;
    transaction_date?: string;
    amount?: number;
    total_price?: number;
    [key: string]: any;
}

export const DailyBriefingTab: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    
    const { data: briefingData, loading: briefingLoading, error: briefingError, refreshData } = useStrategicBriefing();
    const { displayIncome, loading: financeLoading } = useFinanceData();

    const [selectedEvent, setSelectedEvent] = useState<UIAgendaItem | null>(null);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [messageCount, setMessageCount] = useState(0);
    
    const [salesHistory, setSalesHistory] = useState<DailySalesData>({ labels: [], data: [] });
    const [peakTime, setPeakTime] = useState<string | null>(null); 
    const [historyLoading, setHistoryLoading] = useState(true);

    // PHOENIX: Deterministic month name arrays
    const monthsSQ = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];
    const shortMonthsSQ = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Kor', 'Gush', 'Sht', 'Tet', 'Nën', 'Dhj'];
    const monthsEN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const isAlbanian = i18n.language.startsWith('sq') || i18n.language === 'al';
    
    const today = new Date();
    const currentMonths = isAlbanian ? monthsSQ : monthsEN;
    const finalDate = `${today.getDate()} ${currentMonths[today.getMonth()]} ${today.getFullYear()}`;
    
    useEffect(() => {
        const loadData = async () => {
            try {
                const [workspacesData, msgs, transactions] = await Promise.all([
                    apiService.getWorkspaces(),
                    apiService.getInboundMessages('INBOX'),
                    apiService.getPosTransactions()
                ]);
                
                setWorkspaces(workspacesData);
                setMessageCount(msgs.length);
                processSalesHistory(transactions as RawTransaction[]);
                analyzePeakTraffic(transactions as RawTransaction[]);
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setHistoryLoading(false);
            }
        };
        loadData();
    }, [i18n.language]);

    const processSalesHistory = (transactions: RawTransaction[]) => {
        const now = new Date();
        const dates: Date[] = [];
        for (let d = 1; d <= now.getDate(); d++) {
            dates.push(new Date(now.getFullYear(), now.getMonth(), d));
        }

        // PHOENIX: Forced deterministic Albanian formatting for chart labels
        const labels = dates.map(date => {
            if (isAlbanian) {
                // Manually constructs "1 Shk", "2 Shk", etc.
                return `${date.getDate()} ${shortMonthsSQ[date.getMonth()]}`;
            }
            return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        });

        const data = dates.map(targetDate => {
            const targetStr = targetDate.toLocaleDateString('en-CA');
            return transactions.reduce((sum, tx) => {
                const dateVal = tx.transaction_date || tx.date;
                if (!dateVal) return sum;
                const txDate = new Date(dateVal);
                if (isNaN(txDate.getTime())) return sum;
                const txStr = txDate.toLocaleDateString('en-CA');
                return txStr === targetStr ? sum + (tx.total_price || tx.amount || 0) : sum;
            }, 0);
        });
        setSalesHistory({ labels, data });
    };

    const analyzePeakTraffic = (transactions: RawTransaction[]) => {
        if (!transactions || transactions.length === 0) {
            setPeakTime(null);
            return;
        }

        const hourCounts: Record<number, number> = {};
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        transactions.forEach(tx => {
            const dateVal = tx.transaction_date || tx.date;
            if (!dateVal) return;
            const txDate = new Date(dateVal);
            if (txDate >= thirtyDaysAgo && !isNaN(txDate.getTime())) {
                const hour = txDate.getHours();
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            }
        });

        const hourEntries = Object.entries(hourCounts);
        if (hourEntries.length === 0) {
             setPeakTime(null);
             return;
        }

        let maxHour = -1, maxCount = 0;
        hourEntries.forEach(([hour, count]) => {
            if (count > maxCount) {
                maxCount = count;
                maxHour = parseInt(hour);
            }
        });

        setPeakTime(maxHour !== -1 ? `${maxHour}:00 - ${maxHour + 1}:00` : null);
    };

    const handleEventUpdate = () => {
        if(refreshData) refreshData();
    };

    const isLoading = briefingLoading || financeLoading || historyLoading;

    if (isLoading) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>;
    if (briefingError) return <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center"><AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" /><h3 className="text-white font-bold">{t('error.generic')}</h3><p>{t('error.failedToLoad')}</p></div>;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 pb-10">
            <AnimatePresence>
                {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onUpdate={handleEventUpdate} workspaces={workspaces} />}
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
                    <BusinessRhythmCard currentSales={displayIncome} salesHistory={salesHistory} /> 
                </motion.div>
                
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                    <BusinessPulseCard signals={briefingData?.market.signals} currentSales={displayIncome} peakTime={peakTime} />
                </motion.div>
                
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="flex flex-col gap-6">
                    <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => navigate('/business/inbox')} className="group relative bg-gray-900/60 hover:bg-gray-900/80 border border-white/10 rounded-3xl p-6 cursor-pointer transition-all duration-300 backdrop-blur-md">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/20"><Mail size={20} /></div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">Inbox</h3>
                                    <p className="text-sm text-gray-400">{messageCount} {t('inbox.newMessages', 'mesazhe të reja')}</p>
                                </div>
                            </div>
                            <div className="p-2 rounded-full bg-white/5 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-all text-gray-400"><ArrowRight size={20} /></div>
                        </div>
                    </motion.div>
                    <div className="flex-1 min-h-0">
                        {briefingData && <SmartAgendaCard agenda={briefingData.agenda} onEventClick={(event) => setSelectedEvent(event)} />}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default DailyBriefingTab;