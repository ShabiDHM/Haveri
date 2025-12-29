// FILE: src/components/business/briefing/SmartAgendaCard.tsx
// PHOENIX PROTOCOL - TYPE ALIGNMENT
// 1. TYPE: Updated props to accept the new, clean 'UIAgendaItem'.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { UIAgendaItem } from '../../../hooks/useStrategicBriefing';

interface SmartAgendaCardProps {
    agenda: UIAgendaItem[];
    onEventClick: (event: UIAgendaItem) => void;
}

export const SmartAgendaCard: React.FC<SmartAgendaCardProps> = ({ agenda, onEventClick }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="bg-gray-900/50 border border-white/10 rounded-3xl p-6 h-full flex flex-col hover:border-indigo-500/30 transition-colors duration-500">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" /> {t('dashboard.smartAgenda', 'Axhenda Inteligjente')}
                </h3>
                <span className="text-xs text-gray-500">{t('dashboard.priorityTasks', 'Prioritetet e ditës')}</span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {agenda.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                        {t('dashboard.noEvents', 'Nuk ka ngjarje për sot.')}
                    </div>
                ) : (
                    agenda.map((item, index) => (
                        <motion.div 
                            key={item.id}
                            onClick={() => onEventClick(item)}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`group flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${item.kind === 'alert' ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10' : 'bg-gray-800/40 border-white/5 hover:bg-gray-800/80'}`}
                        >
                            <div className="flex flex-col items-center min-w-[3rem] border-r border-white/10 pr-3">
                                <Clock className="w-3 h-3 text-gray-500 mb-1" />
                                <span className="text-xs font-mono text-gray-300">{item.time}</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm text-gray-200 font-medium leading-tight group-hover:text-white transition-colors">{item.title}</h4>
                                {item.priority === 'high' && (<div className="flex items-center gap-1 mt-1 text-xs text-amber-500 font-semibold"><AlertCircle className="w-3 h-3" /> {t('common.urgent', 'Urgjente')}</div>)}
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            <button onClick={() => navigate('/calendar')} className="w-full mt-4 py-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white text-sm font-medium transition-all flex items-center justify-center gap-2 border border-indigo-500/20">
                {t('dashboard.viewCalendar', 'Shiko Kalendarin')}
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    );
};