// FILE: src/components/business/briefing/SmartAgendaCard.tsx
// PHOENIX PROTOCOL - SMART GREETING V4.4 (CLEAN UI)
// 1. REFINEMENT: Removed redundant username to avoid duplication with page header.
// 2. LOGIC: Maintained time-based greetings and Kosovo-specific contextual messages.
// 3. STATUS: Pure, streamlined implementation.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
    Calendar, Clock, ArrowRight, AlertCircle, 
    Sun, Moon, Sunrise, Coffee, PartyPopper, Sparkles 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { UIAgendaItem } from '../../../data/types';
import { isWeekend } from 'date-fns';

interface SmartAgendaCardProps {
    agenda: UIAgendaItem[];
    onEventClick: (event: UIAgendaItem) => void;
}

export const SmartAgendaCard: React.FC<SmartAgendaCardProps> = ({ agenda, onEventClick }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const now = new Date();
    const hour = now.getHours();

    // 1. Temporal Logic: Determine Greeting (without hardcoded name)
    const getGreeting = () => {
        if (hour >= 5 && hour < 12) return { text: "Mirëmëngjes", icon: <Sunrise className="text-amber-400" /> };
        if (hour >= 12 && hour < 18) return { text: "Mirëdita", icon: <Sun className="text-yellow-400" /> };
        return { text: "Mirmëmbrëma", icon: <Moon className="text-indigo-400" /> };
    };

    // 2. Contextual Logic: Detect Holiday or Weekend
    const holidayItem = agenda.find(item => item.type === 'OTHER' && item.title.toLowerCase().includes('holiday'));
    const isSatSun = isWeekend(now);
    const greeting = getGreeting();

    const getContextMessage = () => {
        if (holidayItem) return { text: "Gëzuar Festën!", icon: <PartyPopper className="w-4 h-4 text-pink-400" /> };
        if (isSatSun) return { text: "Kalofshi një vikend të këndshëm!", icon: <Coffee className="w-4 h-4 text-emerald-400" /> };
        return { text: t('dashboard.priorityTasks', 'Prioritetet e ditës:'), icon: <Sparkles className="w-4 h-4 text-blue-400" /> };
    };

    const context = getContextMessage();

    return (
        <div className="bg-gray-900/50 border border-white/10 rounded-3xl p-6 h-full flex flex-col hover:border-indigo-500/30 transition-all duration-500 shadow-xl relative overflow-hidden group">
            {/* Background Decorative Gradient */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors" />

            {/* Header: Contextual Greeting (Name removed to prevent redundancy) */}
            <div className="mb-6 relative z-10">
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                        {greeting.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        {greeting.text}!
                    </h2>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-400 ml-1">
                    {context.icon}
                    <span>{context.text}</span>
                </div>
            </div>

            {/* Section Label */}
            <div className="flex justify-between items-center mb-4 pt-4 border-t border-white/5 relative z-10">
                <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" /> 
                    {t('dashboard.smartAgenda', 'Axhenda Inteligjente')}
                </h3>
            </div>

            {/* Agenda List */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar relative z-10">
                {agenda.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 text-sm gap-3 opacity-30">
                        <Calendar className="w-10 h-10" />
                        {t('dashboard.noEvents', 'Nuk ka planifikime për sot.')}
                    </div>
                ) : (
                    agenda.map((item, index) => {
                        const isCritical = item.priority === 'CRITICAL' || item.priority === 'HIGH';
                        const isRescheduled = item.notes?.includes('[System]');
                        
                        return (
                            <motion.div 
                                key={item.id}
                                onClick={() => onEventClick(item)}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`group/item flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden
                                    ${isCritical 
                                        ? 'bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10 hover:border-rose-500/40' 
                                        : 'bg-gray-800/20 border-white/5 hover:bg-gray-800/40 hover:border-white/10'
                                    }`}
                            >
                                {/* Time Column */}
                                <div className="flex flex-col items-center min-w-[3.5rem] border-r border-white/10 pr-4">
                                    <Clock className={`w-3 h-3 mb-1.5 ${isCritical ? 'text-rose-500' : 'text-gray-500'}`} />
                                    <span className={`text-xs font-mono font-bold ${isCritical ? 'text-rose-400' : 'text-gray-300'}`}>
                                        {item.time}
                                    </span>
                                </div>

                                {/* Content Column */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-sm text-gray-200 font-bold leading-tight truncate group-hover/item:text-white transition-colors">
                                            {item.title}
                                        </h4>
                                        {isRescheduled && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] animate-pulse" />
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        {isCritical && (
                                            <span className="flex items-center gap-1 text-[9px] uppercase font-black text-rose-500 tracking-tighter">
                                                <AlertCircle size={10} /> {t('common.urgent', 'Urgjente')}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-gray-500 truncate font-medium">
                                            {item.type.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>

                                <ArrowRight className="w-4 h-4 text-gray-800 group-hover/item:text-indigo-400 group-hover/item:translate-x-1 transition-all self-center" />
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Footer Action */}
            <button 
                onClick={() => navigate('/calendar')} 
                className="w-full mt-6 py-4 rounded-2xl bg-indigo-500/5 hover:bg-indigo-500 text-indigo-300 hover:text-white text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 border border-indigo-500/20 shadow-lg relative z-10 active:scale-[0.98]"
            >
                {t('dashboard.viewCalendar', 'Hap Kalendarin')}
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    );
};