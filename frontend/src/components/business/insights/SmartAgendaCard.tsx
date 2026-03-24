// FILE: src/components/business/briefing/SmartAgendaCard.tsx
// PHOENIX PROTOCOL - AGENDA CARD V11.1 (EXECUTIVE DESIGN SYSTEM)
// ADDED: shadow-sm, hover-lift, consistent border-border-main, semantic text colors.
// RETAINED: All logic and functionality.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronRight, AlertCircle, DollarSign, Calendar as CalendarIcon, Users, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AgendaItem {
    id: string;
    title: string;
    time: string;
    type: string;
    priority: string;
}

interface SmartAgendaCardProps {
    agenda?: AgendaItem[];
    onEventClick?: (event: any) => void;
}

const getEventIcon = (type: string) => {
    switch (type) {
        case 'TAX_DEADLINE': return <AlertCircle size={16} />;
        case 'PAYMENT_DUE': return <DollarSign size={16} />;
        case 'APPOINTMENT': return <Users size={16} />;
        case 'TASK': return <CheckSquare size={16} />;
        default: return <CalendarIcon size={16} />;
    }
};

const getEventColorClass = (type: string) => {
    switch (type) {
        case 'TAX_DEADLINE': return 'text-danger-start';
        case 'PAYMENT_DUE': return 'text-warning-start';
        case 'APPOINTMENT': return 'text-primary-start';
        case 'TASK': return 'text-success-start';
        default: return 'text-text-muted';
    }
};

export const SmartAgendaCard: React.FC<SmartAgendaCardProps> = ({ agenda = [], onEventClick }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleViewCalendar = () => {
        navigate('/calendar');
    };

    return (
        <div className="glass-panel flex flex-col h-full min-h-[480px] p-6 sm:p-8 hover-lift relative overflow-hidden group shadow-sm border border-border-main">
            
            {/* Ambient Background Glow (Subtle) */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-warning-start/5 rounded-full blur-[60px] group-hover:bg-warning-start/10 transition-colors pointer-events-none" />
            
            {/* Executive Header */}
            <div className="flex justify-between items-center border-b border-border-main pb-5 mb-6 flex-shrink-0 relative z-10">
                <div className="flex items-center gap-3">
                    <Calendar className="text-warning-start" size={20} />
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-widest leading-none">
                        {t('dashboard.smartAgenda', 'Axhenda')}
                    </h3>
                </div>
                <button 
                    onClick={handleViewCalendar}
                    className="text-[9px] text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5 uppercase font-black tracking-widest group/btn hover-lift"
                >
                    {t('dashboard.viewCalendar', 'Shiko Kalendarin')}
                    <ChevronRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 relative z-10">
                {agenda.length === 0 ? (
                    <div className="glass-input flex-1 flex flex-col items-center justify-center text-center p-6 border border-border-main bg-surface/30 backdrop-blur-sm">
                        <div className="w-12 h-12 rounded-full bg-surface/50 border border-border-main flex items-center justify-center mb-4">
                            <Calendar size={20} className="text-text-muted" />
                        </div>
                        <p className="text-xs text-text-muted uppercase font-black tracking-widest">
                            {t('dashboard.noEvents', 'Nuk ka ngjarje për sot.')}
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                        {agenda.slice(0, 4).map((item) => (
                            <div 
                                key={item.id}
                                onClick={() => onEventClick?.(item)}
                                className="glass-input p-4 flex items-center gap-4 group/item hover:border-warning-start/30 transition-all cursor-pointer hover-lift border border-border-main bg-surface/30 backdrop-blur-sm"
                            >
                                <div className={`shrink-0 ${getEventColorClass(item.type)}`}>
                                    {getEventIcon(item.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-text-primary truncate">
                                        {item.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[9px] text-text-muted uppercase font-black tracking-widest leading-none">
                                            {item.time}
                                        </span>
                                        {item.priority === 'CRITICAL' && (
                                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-danger-start/10 text-danger-start uppercase font-black tracking-widest border border-danger-start/20 leading-none">
                                                Urgjente
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight size={14} className="text-text-muted group-hover/item:text-warning-start transition-colors shrink-0" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
