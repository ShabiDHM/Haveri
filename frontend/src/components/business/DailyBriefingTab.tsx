// FILE: src/components/business/DailyBriefingTab.tsx
// PHOENIX PROTOCOL - DASHBOARD V12.0 (REMOVED HERO HEADER)
// STATUS: CLEAN - VERIFIED - FULL FILE REPLACEMENT

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertTriangle, Mail, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useStrategicBriefing } from '../../hooks/useStrategicBriefing';
import { useFinanceData } from '../../hooks/useFinanceData';
import { EventDetailModal } from '../modals/EventDetailModal';
import { apiService } from '../../services/api';
import { Workspace, UIAgendaItem, SalesTrendPoint } from '../../data/types'; 

import { BusinessRhythmCard, DailySalesData } from './briefing/BusinessRhythmCard';
import { BusinessPulseCard } from './briefing/BusinessPulseCard';
import { SmartAgendaCard } from './briefing/SmartAgendaCard';

export const DailyBriefingTab: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    
    const { 
        displayIncome, 
        analyticsData, 
        posTransactions, 
        selectedYear, 
        loading: financeLoading 
    } = useFinanceData();
    
    const { 
        data: briefingData, 
        loading: briefingLoading, 
        error: briefingError, 
        refreshData 
    } = useStrategicBriefing();

    const [selectedEvent, setSelectedEvent] = useState<UIAgendaItem | null>(null);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [messageCount, setMessageCount] = useState(0);
    
    const [salesHistory, setSalesHistory] = useState<DailySalesData>({ labels: [], data: [] });
    const [peakTime, setPeakTime] = useState<string | null>(null); 
    const [localLoading, setLocalLoading] = useState(true);

    const isAlbanian = i18n.language.startsWith('sq') || i18n.language === 'al';
    const shortMonthsSQ = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Kor', 'Gush', 'Sht', 'Tet', 'Nën', 'Dhj'];

    useEffect(() => {
        const loadAmbientData = async () => {
            try {
                const [workspacesData, msgs] = await Promise.all([
                    apiService.getWorkspaces(),
                    apiService.getInboundMessages('INBOX')
                ]);
                setWorkspaces(workspacesData);
                setMessageCount(msgs.length);
            } catch (err) {
                console.error("[Dashboard] Background load failure:", err);
            } finally {
                setLocalLoading(false);
            }
        };
        loadAmbientData();
    }, []);

    useEffect(() => {
        if (analyticsData?.sales_trend) {
            processSalesHistory(analyticsData.sales_trend);
        } else {
            setSalesHistory({ labels: [], data: [] });
        }

        if (posTransactions && posTransactions.length > 0) {
            analyzePeakTraffic(posTransactions);
        } else {
            setPeakTime(null);
        }
    }, [analyticsData, posTransactions, i18n.language, selectedYear]);

    const processSalesHistory = (trend: SalesTrendPoint[]) => {
        if (!trend || trend.length === 0) {
            setSalesHistory({ labels: [], data: [] });
            return;
        }

        const labels = trend.map(point => {
            const date = new Date(point.date);
            if (isNaN(date.getTime())) return point.date;
            
            if (isAlbanian) {
                return `${date.getDate()} ${shortMonthsSQ[date.getMonth()]}`;
            }
            return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        });

        const data = trend.map(point => point.amount);
        setSalesHistory({ labels, data });
    };

    const analyzePeakTraffic = (transactions: any[]) => {
        if (!transactions || transactions.length === 0) {
            setPeakTime(null);
            return;
        }

        const hourCounts: Record<number, number> = {};
        
        transactions.forEach(tx => {
            const dateVal = tx.transaction_date || tx.date_time || tx.date;
            if (!dateVal) return;
            const txDate = new Date(dateVal);
            if (!isNaN(txDate.getTime()) && txDate.getFullYear() === selectedYear) {
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

    const isLoading = briefingLoading || financeLoading || localLoading;

    if (isLoading) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
    if (briefingError) return <div className="p-6 bg-danger/10 border border-danger/20 rounded-2xl text-center"><AlertTriangle className="w-10 h-10 text-danger mx-auto mb-3" /><h3 className="text-text-primary font-bold">{t('error.generic')}</h3><p>{t('error.failedToLoad')}</p></div>;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 pb-10">
            <AnimatePresence>
                {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onUpdate={handleEventUpdate} workspaces={workspaces} />}
            </AnimatePresence>
            
            {/* Tactical Grid - Dashboard starts here */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-fr">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    <BusinessRhythmCard 
                        currentSales={displayIncome} 
                        salesHistory={salesHistory} 
                    /> 
                </motion.div>
                
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                    <BusinessPulseCard 
                        signals={briefingData?.market.signals} 
                        currentSales={displayIncome} 
                        peakTime={peakTime} 
                    />
                </motion.div>
                
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="flex flex-col gap-6">
                    {/* Inbox Card */}
                    <motion.div 
                        whileHover={{ scale: 1.02, y: -2 }} 
                        whileTap={{ scale: 0.98 }} 
                        onClick={() => navigate('/business/inbox')} 
                        className="group relative bg-card hover:bg-card/95 border border-border-strong rounded-3xl p-6 cursor-pointer transition-all duration-300 overflow-hidden shadow-sm"
                    >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/80 z-10 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        
                        <div className="flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-primary/20 text-primary border border-primary/20">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-text-primary text-lg">Inbox</h3>
                                    <p className="text-sm text-text-muted">{messageCount} {t('inbox.newMessages', 'mesazhe të reja')}</p>
                                </div>
                            </div>
                            <div className="p-2 rounded-full bg-surface group-hover:bg-primary/20 group-hover:text-primary transition-all text-text-muted">
                                <ArrowRight size={20} />
                            </div>
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