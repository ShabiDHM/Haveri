// FILE: src/components/business/briefing/SmartAgendaCard.tsx
// PHOENIX PROTOCOL - SMART GREETING V6.0 (CONSISTENT TYPOGRAPHY)
// 1. REFINEMENT: Removed redundant username to avoid duplication with page header.
// 2. LOGIC: Maintained time-based greetings and Kosovo-specific contextual messages.
// 3. UPDATED: Uses new design system CSS variables for light/dark theme compatibility.
// 4. TYPOGRAPHY: Standardized text sizes (removed text-[9px], text-[10px])
// 5. STATUS: Pure, streamlined implementation.

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

    const getGreeting = () => {
        if (hour >= 5 && hour < 12) return { text: "Mirëmëngjes", icon: <Sunrise className="text-warning-start" /> };
        if (hour >= 12 && hour < 18) return { text: "Mirëdita", icon: <Sun className="text-warning-start" /> };
        return { text: "Mirmëmbrëma", icon: <Moon className="text-primary" /> };
    };

    const holidayItem = agenda.find(item => item.type === 'OTHER' && item.title.toLowerCase().includes('holiday'));
    const isSatSun = isWeekend(now);
    const greeting = getGreeting();

    const getContextMessage = () => {
        if (holidayItem) return { text: "Gëzuar Festën!", icon: <PartyPopper className="w-4 h-4 text-danger" /> };
        if (isSatSun) return { text: "Kalofshi një vikend të këndshëm!", icon: <Coffee className="w-4 h-4 text-success-start" /> };
        return { text: t('dashboard.priorityTasks', 'Prioritetet e ditës:'), icon: <Sparkles className="w-4 h-4 text-primary" /> };
    };

    const context = getContextMessage();

    return (
        <div className="bg-surface/50 border border-border-main rounded-3xl p-6 h-full flex flex-col hover:border-primary/30 transition-all duration-500 shadow-sm relative overflow-hidden group">
            {/* Background Decorative Gradient */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />

            {/* Header: Contextual Greeting */}
            <div className="mb-6 relative z-10">
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-surface rounded-xl border border-border-main">
                        {greeting.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-text-primary tracking-tight">
                        {greeting.text}!
                    </h2>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-text-muted ml-1">
                    {context.icon}
                    <span>{context.text}</span>
                </div>
            </div>

            {/* Section Label */}
            <div className="flex justify-between items-center mb-4 pt-4 border-t border-border-main relative z-10">
                <h3 className="text-text-muted text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> 
                    {t('dashboard.smartAgenda', 'Axhenda Inteligjente')}
                </h3>
            </div>

            {/* Agenda List */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar relative z-10">
                {agenda.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-muted text-sm gap-3 opacity-30">
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
                                        ? 'bg-danger/5 border-danger/20 hover:bg-danger/10 hover:border-danger/40' 
                                        : 'bg-surface border-border-main hover:bg-hover hover:border-border-main'
                                    }`}
                            >
                                {/* Time Column */}
                                <div className="flex flex-col items-center min-w-[3.5rem] border-r border-border-main pr-4">
                                    <Clock className={`w-3 h-3 mb-1.5 ${isCritical ? 'text-danger' : 'text-text-muted'}`} />
                                    <span className={`text-xs font-mono font-bold ${isCritical ? 'text-danger' : 'text-text-secondary'}`}>
                                        {item.time}
                                    </span>
                                </div>

                                {/* Content Column */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-sm text-text-secondary font-bold leading-tight truncate group-hover/item:text-text-primary transition-colors">
                                            {item.title}
                                        </h4>
                                        {isRescheduled && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        {isCritical && (
                                            <span className="flex items-center gap-1 text-xs font-bold uppercase text-danger tracking-wide">
                                                <AlertCircle size={12} /> {t('common.urgent', 'Urgjente')}
                                            </span>
                                        )}
                                        <span className="text-xs text-text-muted truncate font-medium">
                                            {item.type.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>

                                <ArrowRight className="w-4 h-4 text-border-main group-hover/item:text-primary group-hover/item:translate-x-1 transition-all self-center" />
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Footer Action */}
            <button 
                onClick={() => navigate('/calendar')} 
                className="w-full mt-6 py-4 rounded-2xl bg-primary/5 hover:bg-primary text-primary hover:text-inverse text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-3 border border-primary/20 shadow-sm relative z-10 active:scale-[0.98]"
            >
                {t('dashboard.viewCalendar', 'Hap Kalendarin')}
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    );
};