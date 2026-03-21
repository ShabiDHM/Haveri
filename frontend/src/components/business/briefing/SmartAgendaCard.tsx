// FILE: src/components/business/briefing/SmartAgendaCard.tsx
// PHOENIX PROTOCOL - AGENDA CARD V9.0 (VISIBLE ACCENT BAR)

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
        case 'TAX_DEADLINE': return <AlertCircle size={14} className="text-danger" />;
        case 'PAYMENT_DUE': return <DollarSign size={14} className="text-warning-start" />;
        case 'APPOINTMENT': return <Users size={14} className="text-primary" />;
        case 'TASK': return <CheckSquare size={14} className="text-success-start" />;
        default: return <CalendarIcon size={14} className="text-text-muted" />;
    }
};

export const SmartAgendaCard: React.FC<SmartAgendaCardProps> = ({ agenda = [], onEventClick }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleViewCalendar = () => {
        navigate('/calendar');
    };

    return (
        <div className="bg-card border border-border-strong rounded-3xl p-6 h-full flex flex-col relative overflow-hidden group shadow-sm">
            {/* Colored top accent bar - 4px with glow */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-warning-start to-warning-start/80 z-10 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            
            <div className="absolute top-0 right-0 w-32 h-32 bg-warning-start/5 rounded-full blur-[60px] group-hover:bg-warning-start/10 transition-all" />
            
            <div className="flex justify-between items-center mb-4 relative z-10">
                <h3 className="text-text-muted text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-warning-start" /> {t('dashboard.smartAgenda', 'Axhenda')}
                </h3>
                <button 
                    onClick={handleViewCalendar}
                    className="text-xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
                >
                    {t('dashboard.viewCalendar', 'Shiko Kalendarin')}
                    <ChevronRight size={12} />
                </button>
            </div>

            <div className="flex-1 relative z-10">
                {agenda.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                        <div className="w-12 h-12 rounded-full bg-surface border border-border-strong flex items-center justify-center mb-3">
                            <Calendar size={20} className="text-text-muted" />
                        </div>
                        <p className="text-sm text-text-muted">{t('dashboard.noEvents', 'Nuk ka ngjarje për sot')}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {agenda.slice(0, 4).map((item) => (
                            <div 
                                key={item.id}
                                onClick={() => onEventClick?.(item)}
                                className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-border-strong hover:border-warning-start/30 hover:bg-hover transition-all cursor-pointer group/item"
                            >
                                <div className={`p-2 rounded-lg ${item.priority === 'CRITICAL' ? 'bg-danger/10' : item.priority === 'HIGH' ? 'bg-warning-start/10' : 'bg-primary/10'}`}>
                                    {getEventIcon(item.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-text-muted">{item.time}</span>
                                        {item.priority === 'CRITICAL' && (
                                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-danger/10 text-danger uppercase font-bold">Urgjente</span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight size={14} className="text-text-muted group-hover/item:text-primary transition-colors" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};