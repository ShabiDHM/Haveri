// FILE: src/components/modals/EventDetailModal.tsx
// PHOENIX PROTOCOL - WORKSPACE ALIGNMENT V3.0
// 1. REBRAND: Renamed 'Case' to 'Workspace' across interfaces and logic.
// 2. FIXED: Updated property access to use 'workspace_id'.
// 3. STATUS: Fully synchronized with rebranding.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Workspace, CalendarEvent } from '../../data/types'; // PHOENIX: Swapped Case for Workspace
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
      case 'TAX_DEADLINE': return { border: 'border-rose-500/50', bg: 'bg-rose-500/10', text: 'text-rose-300', icon: <ShieldAlert size={32} className="text-rose-400" /> };
      case 'PAYMENT_DUE': return { border: 'border-amber-500/50', bg: 'bg-amber-500/10', text: 'text-amber-300', icon: <DollarSign size={32} className="text-amber-400" /> };
      case 'APPOINTMENT': return { border: 'border-blue-500/50', bg: 'bg-blue-500/10', text: 'text-blue-300', icon: <Handshake size={32} className="text-blue-400" /> };
      case 'TASK': return { border: 'border-emerald-500/50', bg: 'bg-emerald-500/10', text: 'text-emerald-300', icon: <CheckSquare size={32} className="text-emerald-400" /> };
      case 'PERSONAL': return { border: 'border-gray-500/50', bg: 'bg-gray-500/10', text: 'text-gray-300', icon: <Users size={32} className="text-gray-400" /> };
      default: return { border: 'border-gray-600/50', bg: 'bg-gray-600/10', text: 'text-gray-300', icon: <CalendarIcon size={32} className="text-gray-400" /> };
    }
};

interface EventDetailModalProps { 
    event: UIAgendaItem; 
    onClose: () => void; 
    onUpdate?: () => void; 
    workspaces?: Workspace[]; // PHOENIX: Prop renamed for consistency
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
    // PHOENIX: Logic updated to use workspace_id
    const relatedWorkspace = workspaces.find(w => w.id === rawEvent.workspace_id);
    
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-[#0f172a] border border-blue-500/20 rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-blue-900/20 custom-scrollbar">
                <div className="flex items-start justify-between mb-8">
                    <div className="flex items-start space-x-5">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${style.border} ${style.bg}`}>{style.icon}</div>
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">{event.title}</h2>
                            <div className="flex flex-wrap gap-2">
                                <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${style.bg} ${style.text} border ${style.border}`}>{t(`calendar.types.${rawEvent.event_type}`, rawEvent.event_type)}</span>
                                {rawEvent.priority && <span className="text-xs px-3 py-1 rounded-full border border-white/10 bg-black/20 text-gray-300 font-bold uppercase tracking-wider">{t(`calendar.priorities.${rawEvent.priority}`)}</span>}
                                {relatedWorkspace && <span className="text-xs px-3 py-1 rounded-full border border-white/10 bg-black/20 text-gray-300 font-bold flex items-center gap-2"><Briefcase size={14}/> {relatedWorkspace.title}</span>}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-500 hover:text-white"><X size={24} /></button>
                </div>

                <div className="space-y-6">
                    {rawEvent.description && (<div className="bg-black/30 p-4 rounded-xl border border-white/10"><h3 className="text-xs font-bold text-gray-500 uppercase mb-2">{t('calendar.detailModal.description')}</h3><p className="text-gray-200 text-sm leading-relaxed">{rawEvent.description}</p></div>)}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div><h3 className="text-xs font-bold text-gray-500 uppercase mb-1">{t('calendar.detailModal.startDate')}</h3><div className="flex items-center text-white gap-3"><Clock className="h-4 w-4 text-blue-400" />{formatEventDate(rawEvent.start_date)}</div></div>
                        {rawEvent.end_date && rawEvent.end_date !== rawEvent.start_date && <div><h3 className="text-xs font-bold text-gray-500 uppercase mb-1">{t('calendar.detailModal.endDate')}</h3><div className="flex items-center text-white gap-3"><Clock className="h-4 w-4 text-blue-400" />{formatEventDate(rawEvent.end_date)}</div></div>}
                    </div>
                    {rawEvent.location && <div><h3 className="text-xs font-bold text-gray-500 uppercase mb-1">{t('calendar.detailModal.location')}</h3><div className="flex items-center text-white gap-3"><MapPin className="h-4 w-4 text-blue-400" />{rawEvent.location}</div></div>}
                    {rawEvent.attendees && rawEvent.attendees.length > 0 && (<div><h3 className="text-xs font-bold text-gray-500 uppercase mb-1">{t('calendar.detailModal.attendees')}</h3><div className="flex flex-wrap gap-2 mt-2">{rawEvent.attendees.map((att, i) => (<span key={i} className="flex items-center text-sm bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-300"><Users className="h-4 w-4 mr-2" />{att}</span>))}</div></div>)}
                    {rawEvent.notes && (<div><h3 className="text-xs font-bold text-gray-500 uppercase mb-2">{t('calendar.detailModal.notes')}</h3><p className="text-gray-400 italic text-sm">{rawEvent.notes}</p></div>)}
                </div>
                <div className="flex space-x-4 mt-10 pt-6 border-t border-white/10">
                    <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition font-medium">{t('calendar.detailModal.close')}</button>
                    {onUpdate && <button onClick={handleDelete} disabled={isDeleting} className="flex-1 px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition font-medium disabled:opacity-50">{isDeleting ? t('general.loading') : t('calendar.detailModal.delete')}</button>}
                </div>
            </motion.div>
        </motion.div>
    );
};