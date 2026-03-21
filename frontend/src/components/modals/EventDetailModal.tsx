// FILE: src/components/modals/EventDetailModal.tsx
// PHOENIX PROTOCOL - WORKSPACE ALIGNMENT V4.0 (DESIGN SYSTEM ALIGNMENT)
// 1. REBRAND: Renamed 'Case' to 'Workspace' across interfaces and logic.
// 2. FIXED: Updated property access to use 'workspace_id'.
// 3. UPDATED: Uses new design system CSS variables for light/dark theme compatibility.
// 4. STATUS: Fully synchronized with rebranding.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Workspace, CalendarEvent } from '../../data/types';
import { apiService } from '../../services/api';
import { format, parseISO } from 'date-fns';
import { sq, enUS } from 'date-fns/locale';
import { 
    Clock, MapPin, Users, Briefcase, X, ShieldAlert, 
    DollarSign, CheckSquare, Handshake, Calendar as CalendarIcon 
} from 'lucide-react';

const localeMap: { [key: string]: any } = { sq: sq, al: sq, en: enUS };

export interface UIAgendaItem {
    id: string;
    title: string;
    time: string;
    type: CalendarEvent['event_type'];
    priority: string;
    isCompleted: boolean;
    kind: 'event' | 'task' | 'alert';
    raw: CalendarEvent;
}

const getEventStyle = (type: string) => {
    switch (type) {
      case 'TAX_DEADLINE': return { border: 'border-danger/50', bg: 'bg-danger/10', text: 'text-danger', icon: <ShieldAlert size={32} className="text-danger" /> };
      case 'PAYMENT_DUE': return { border: 'border-warning-start/50', bg: 'bg-warning-start/10', text: 'text-warning-start', icon: <DollarSign size={32} className="text-warning-start" /> };
      case 'APPOINTMENT': return { border: 'border-primary/50', bg: 'bg-primary/10', text: 'text-primary', icon: <Handshake size={32} className="text-primary" /> };
      case 'TASK': return { border: 'border-success-start/50', bg: 'bg-success-start/10', text: 'text-success-start', icon: <CheckSquare size={32} className="text-success-start" /> };
      case 'PERSONAL': return { border: 'border-text-muted/50', bg: 'bg-text-muted/10', text: 'text-text-secondary', icon: <Users size={32} className="text-text-muted" /> };
      default: return { border: 'border-border-main/50', bg: 'bg-surface', text: 'text-text-secondary', icon: <CalendarIcon size={32} className="text-text-muted" /> };
    }
};

interface EventDetailModalProps { 
    event: UIAgendaItem; 
    onClose: () => void; 
    onUpdate?: () => void; 
    workspaces?: Workspace[];
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, onClose, onUpdate, workspaces = [] }) => {
    const { t, i18n } = useTranslation();
    const currentLocale = localeMap[i18n.language] || enUS; 
    const [isDeleting, setIsDeleting] = useState(false);
    
    const rawEvent = event.raw;
    
    const formatEventDate = (dateString: string) => {
        const date = parseISO(dateString);
        const formatStr = (rawEvent.is_all_day) ? 'dd MMMM yyyy' : 'dd MMMM yyyy, HH:mm';
        return format(date, formatStr, { locale: currentLocale });
    };
    
    const handleDelete = async () => {
        if (!onUpdate || !window.confirm(t('calendar.detailModal.deleteConfirm'))) return;
        setIsDeleting(true);
        try {
            await apiService.deleteCalendarEvent(event.id);
            onUpdate();
            onClose();
        } catch (error: any) {
            alert(error.response?.data?.message || t('calendar.detailModal.deleteFailed'));
        } finally {
            setIsDeleting(false);
        }
    };
    
    const style = getEventStyle(rawEvent.event_type);
    const relatedWorkspace = workspaces.find(w => w.id === rawEvent.workspace_id);
    
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-glass backdrop-blur-xl border border-primary/20 rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl custom-scrollbar">
                <div className="flex items-start justify-between mb-8">
                    <div className="flex items-start space-x-5">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${style.border} ${style.bg}`}>{style.icon}</div>
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary mb-2">{event.title}</h2>
                            <div className="flex flex-wrap gap-2">
                                <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${style.bg} ${style.text} border ${style.border}`}>{t(`calendar.types.${rawEvent.event_type}`, rawEvent.event_type)}</span>
                                {rawEvent.priority && <span className="text-xs px-3 py-1 rounded-full border border-border-main bg-surface text-text-secondary font-bold uppercase tracking-wider">{t(`calendar.priorities.${rawEvent.priority}`)}</span>}
                                {relatedWorkspace && <span className="text-xs px-3 py-1 rounded-full border border-border-main bg-surface text-text-secondary font-bold flex items-center gap-2"><Briefcase size={14}/> {relatedWorkspace.title}</span>}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-hover rounded-full transition-colors text-text-muted hover:text-text-primary"><X size={24} /></button>
                </div>

                <div className="space-y-6">
                    {rawEvent.description && (<div className="bg-surface p-4 rounded-xl border border-border-main"><h3 className="text-xs font-bold text-text-muted uppercase mb-2">{t('calendar.detailModal.description')}</h3><p className="text-text-secondary text-sm leading-relaxed">{rawEvent.description}</p></div>)}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div><h3 className="text-xs font-bold text-text-muted uppercase mb-1">{t('calendar.detailModal.startDate')}</h3><div className="flex items-center text-text-primary gap-3"><Clock className="h-4 w-4 text-primary" />{formatEventDate(rawEvent.start_date)}</div></div>
                        {rawEvent.end_date && rawEvent.end_date !== rawEvent.start_date && <div><h3 className="text-xs font-bold text-text-muted uppercase mb-1">{t('calendar.detailModal.endDate')}</h3><div className="flex items-center text-text-primary gap-3"><Clock className="h-4 w-4 text-primary" />{formatEventDate(rawEvent.end_date)}</div></div>}
                    </div>
                    {rawEvent.location && <div><h3 className="text-xs font-bold text-text-muted uppercase mb-1">{t('calendar.detailModal.location')}</h3><div className="flex items-center text-text-primary gap-3"><MapPin className="h-4 w-4 text-primary" />{rawEvent.location}</div></div>}
                    {rawEvent.attendees && rawEvent.attendees.length > 0 && (<div><h3 className="text-xs font-bold text-text-muted uppercase mb-1">{t('calendar.detailModal.attendees')}</h3><div className="flex flex-wrap gap-2 mt-2">{rawEvent.attendees.map((att, i) => (<span key={i} className="flex items-center text-sm bg-surface px-3 py-1.5 rounded-lg border border-border-main text-text-secondary"><Users className="h-4 w-4 mr-2" />{att}</span>))}</div></div>)}
                    {rawEvent.notes && (<div><h3 className="text-xs font-bold text-text-muted uppercase mb-2">{t('calendar.detailModal.notes')}</h3><p className="text-text-muted italic text-sm">{rawEvent.notes}</p></div>)}
                </div>
                <div className="flex space-x-4 mt-10 pt-6 border-t border-border-main">
                    <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl bg-surface text-text-secondary hover:bg-hover transition font-medium">{t('calendar.detailModal.close')}</button>
                    {onUpdate && <button onClick={handleDelete} disabled={isDeleting} className="flex-1 px-4 py-3 bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20 rounded-xl transition font-medium disabled:opacity-50">{isDeleting ? t('general.loading') : t('calendar.detailModal.delete')}</button>}
                </div>
            </motion.div>
        </motion.div>
    );
};