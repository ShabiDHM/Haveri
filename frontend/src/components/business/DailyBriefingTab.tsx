// FILE: src/components/business/DailyBriefingTab.tsx
// PHOENIX PROTOCOL - NAVIGATION LINKING
// 1. REFACTOR: The 'BriefingEventModal' is now a gateway, not a dead end.
// 2. FEATURE: Added a "View Details" button that navigates to the full calendar page with the event context.
// 3. CLEANUP: Removed the non-functional 'Delete' button from this preview modal.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Loader2, Target, AlertTriangle, X, Clock, Handshake, CheckSquare, DollarSign, ShieldAlert, Users, ExternalLink } from 'lucide-react';
import { useStrategicBriefing, AgendaItem } from '../../hooks/useStrategicBriefing';
import { parseISO } from 'date-fns';

// Imports
import { BusinessRhythmCard } from './briefing/BusinessRhythmCard';
import { ProductPerformanceCard } from './briefing/ProductPerformanceCard';
import { SmartAgendaCard } from './briefing/SmartAgendaCard';

// --- Integrated Detail Modal Component (Gateway Modal) ---
interface BriefingEventModalProps {
    item: AgendaItem;
    onClose: () => void;
    onViewDetails: (item: AgendaItem) => void; // PHOENIX: Added callback
}
const BriefingEventModal: React.FC<BriefingEventModalProps> = ({ item, onClose, onViewDetails }) => {
    const { t } = useTranslation();
    const months = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];
    
    const eventDate = parseISO(item.fullDate);
    const day = eventDate.getDate();
    const month = months[eventDate.getMonth()];
    const year = eventDate.getFullYear();
    const formattedDate = `${day} ${month} ${year}`;

    const getIcon = () => {
        switch (item.originalType) {
            case 'APPOINTMENT': return <Handshake size={24} className="text-blue-400" />;
            case 'TASK': return <CheckSquare size={24} className="text-emerald-400" />;
            case 'PAYMENT_DUE': return <DollarSign size={24} className="text-amber-400" />;
            case 'TAX_DEADLINE': return <ShieldAlert size={24} className="text-rose-400" />;
            default: return <Users size={24} className="text-gray-400" />;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-gray-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl relative"
            >
                <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 flex items-center justify-center bg-gray-800 rounded-lg border border-white/10">
                        {getIcon()}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">{item.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-1 text-xs font-bold text-gray-300 bg-white/5 rounded uppercase">{t(`calendar.types.${item.originalType}`, item.originalType)}</span>
                            <span className="px-2 py-1 text-xs font-bold text-gray-300 bg-white/5 rounded uppercase">{t(`calendar.priorities.${item.priority.toUpperCase()}`, item.priority)}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-black/30 p-3 rounded-lg border border-white/5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300 font-medium">{t('calendar.detailModal.startDate')}:</span>
                        <span className="text-sm text-white font-bold">{formattedDate}</span>
                    </div>
                </div>
                
                {/* PHOENIX: Replaced button layout */}
                <div className="grid grid-cols-2 gap-4 mt-8">
                    <button onClick={onClose} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors">{t('calendar.detailModal.close', 'Mbyll')}</button>
                    <button onClick={() => onViewDetails(item)} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors flex items-center justify-center gap-2">
                        <ExternalLink size={16} />
                        {t('actions.view', 'Shiko Detajet')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};


export const DailyBriefingTab: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate(); // PHOENIX: Added navigation hook
    const { data, loading, error } = useStrategicBriefing();
    const [selectedEvent, setSelectedEvent] = useState<AgendaItem | null>(null);

    const months = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];
    const today = new Date();
    const day = today.getDate();
    const month = months[today.getMonth()];
    const year = today.getFullYear();
    const finalDate = `${day} ${month} ${year}`;

    // PHOENIX: Handler function to navigate to the calendar page
    const handleViewDetails = (event: AgendaItem) => {
        setSelectedEvent(null); // Close the light modal
        navigate('/calendar', { state: { openEventId: event.id } });
    };

    if (loading) return ( <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div> );
    if (error) return ( <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center"><AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" /><h3 className="text-white font-bold">{t('error.generic', 'Diçka shkoi keq')}</h3><p className="text-gray-400 text-sm mt-1">{t('error.failedToLoad', 'Nuk mundëm të ngarkojmë të dhënat strategjike.')}</p></div> );

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 pb-10">
            <AnimatePresence>
                {selectedEvent && (
                    <BriefingEventModal 
                        item={selectedEvent} 
                        onClose={() => setSelectedEvent(null)} 
                        onViewDetails={handleViewDetails}
                    />
                )}
            </AnimatePresence>
            
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 to-slate-900 border border-white/10 p-6 sm:p-10 text-center sm:text-left shadow-2xl">
                <div className="absolute top-0 right-0 p-40 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight flex items-center justify-center sm:justify-start gap-3"><Target className="text-indigo-400 fill-indigo-400/20" /> {t('dashboard.dailyOverviewTitle', 'Pasqyra Ditore')}</h2>
                        <p className="text-gray-400 text-lg max-w-xl">{t('dashboard.dailyOverviewSubtitle', 'Përmbledhja e operacioneve dhe rekomandimet.')}</p>
                    </div>
                    <div className="hidden sm:block text-right">
                        <div className="text-sm text-gray-500 uppercase tracking-widest font-semibold">{t('common.today', 'SOT')}</div>
                        <div className="text-xl sm:text-2xl text-white font-mono font-bold tracking-tight">{finalDate}</div>
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