// FILE: src/pages/CalendarPage.tsx
// PHOENIX PROTOCOL - BUSINESS KUJDESTARI UI V4.1 (WORKSPACE ALIGNMENT)
// 1. REBRAND: Renamed all 'Case' references to 'Workspace'.
// 2. STATUS: Fully synchronized with Workspace architecture.

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarEvent, Workspace, CalendarEventCreateRequest, EventPriority } from '../data/types'; // PHOENIX: Swapped Case for Workspace
import { apiService } from '../services/api';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  format, addMonths, subMonths, startOfMonth, getDay, getDaysInMonth, 
  isSameDay, isToday as isTodayFns, parseISO, startOfWeek, addDays, Locale
} from 'date-fns';
import { sq, enUS } from 'date-fns/locale'; 
import {
  Calendar as CalendarIcon, Users, AlertCircle, Plus, ChevronLeft, ChevronRight,
  Search, Bell, ChevronDown, Eye, EyeOff, ShieldAlert, X,
  DollarSign, CheckSquare, Handshake, Info, Zap
} from 'lucide-react';
import * as ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/DatePicker.css';
import DayEventsModal from '../components/DayEventsModal';
import { EventDetailModal, UIAgendaItem } from '../components/modals/EventDetailModal';

const DatePicker = (ReactDatePicker as any).default;
const localeMap: { [key: string]: Locale } = { sq: sq, al: sq, en: enUS };

interface CreateEventModalProps { workspaces: Workspace[]; existingEvents: CalendarEvent[]; onClose: () => void; onCreate: () => void; } // PHOENIX: Renamed prop
type ViewMode = 'month' | 'list';

const getEventStyle = (type: string) => {
    switch (type) {
      case 'TAX_DEADLINE': return { border: 'border-rose-500/50', bg: 'bg-rose-500/10 hover:bg-rose-500/20', text: 'text-rose-300', indicator: 'bg-rose-500', icon: <ShieldAlert size={12} className="text-rose-400" /> };
      case 'PAYMENT_DUE': return { border: 'border-amber-500/50', bg: 'bg-amber-500/10 hover:bg-amber-500/20', text: 'text-amber-300', indicator: 'bg-amber-500', icon: <DollarSign size={12} className="text-amber-400" /> };
      case 'APPOINTMENT': return { border: 'border-blue-500/50', bg: 'bg-blue-500/10 hover:bg-blue-500/20', text: 'text-blue-300', indicator: 'bg-blue-500', icon: <Handshake size={12} className="text-blue-400" /> };
      case 'TASK': return { border: 'border-emerald-500/50', bg: 'bg-emerald-500/10 hover:bg-emerald-500/20', text: 'text-emerald-300', indicator: 'bg-emerald-500', icon: <CheckSquare size={12} className="text-emerald-400" /> };
      case 'PERSONAL': return { border: 'border-gray-500/50', bg: 'bg-gray-500/10 hover:bg-gray-500/20', text: 'text-gray-300', indicator: 'bg-gray-500', icon: <Users size={12} className="text-gray-400" /> };
      default: return { border: 'border-gray-600/50', bg: 'bg-gray-600/10 hover:bg-gray-600/20', text: 'text-gray-300', indicator: 'bg-gray-600', icon: <CalendarIcon size={12} className="text-gray-400" /> };
    }
};

const getEventId = (event: CalendarEvent): string => (event as any).id || (event as any)._id || '';

const CreateEventModal: React.FC<CreateEventModalProps> = ({ workspaces, existingEvents, onClose, onCreate }) => { // PHOENIX: Renamed prop
    const { t, i18n } = useTranslation();
    const currentLocale = localeMap[i18n.language] || enUS; 
    const [isCreating, setIsCreating] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [eventDate, setEventDate] = useState<Date | null>(new Date());
    const [conflictWarning, setConflictWarning] = useState<string | null>(null);
    const [isPublic, setIsPublic] = useState(false);

    const [formData, setFormData] = useState<Omit<CalendarEventCreateRequest, 'attendees' | 'start_date' | 'end_date' | 'is_public'> & { attendees: string, is_public: boolean }>({ 
        workspace_id: '', title: '', description: '', event_type: 'TASK', location: '', attendees: '', is_all_day: true, priority: 'MEDIUM', notes: '', is_public: false // PHOENIX: Updated to workspace_id
    });

    const isSmartType = ['TAX_DEADLINE', 'PAYMENT_DUE'].includes(formData.event_type);
    
    useEffect(() => { if (!eventDate) { setConflictWarning(null); return; } const hasConflict = existingEvents.some(ev => isSameDay(parseISO(ev.start_date), eventDate)); if (hasConflict) setConflictWarning(t('calendar.conflictWarning')); else setConflictWarning(null); }, [eventDate, existingEvents, t]);
    
    const handleSubmit = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (!eventDate) { alert(t('calendar.createModal.dateTimePlaceholder')); return; } 
        setIsCreating(true); 
        try { 
            const cleanDate = new Date(Date.UTC(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 12, 0, 0)); 
            const isoDate = cleanDate.toISOString(); 
            const payload: CalendarEventCreateRequest = { 
                ...formData, 
                start_date: isoDate, 
                end_date: isoDate, 
                attendees: formData.attendees ? formData.attendees.split(',').map(a => a.trim()) : [], 
                is_public: isPublic 
            }; 
            await apiService.createCalendarEvent(payload); 
            onCreate(); 
            onClose(); 
        } catch (error: any) { 
            alert(error.response?.data?.message || t('calendar.createModal.createFailed')); 
        } finally { 
            setIsCreating(false); 
        } 
    };
    
    const formElementClasses = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-600 appearance-none";
    
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-[#0f172a] border border-blue-500/20 rounded-3xl p-8 w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl shadow-blue-900/20">
                <div className="flex justify-between items-center mb-6 flex-shrink-0"><h2 className="text-2xl font-bold text-white">{t('calendar.createModal.title')}</h2><button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={24} /></button></div>
                
                {isSmartType && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4 flex items-center gap-3">
                        <Zap className="text-blue-400 h-5 w-5 animate-pulse" />
                        <span className="text-blue-200 text-xs font-bold uppercase tracking-tight">Kujdestari Active: Auto-adjusts for Kosovo holidays.</span>
                    </div>
                )}

                {conflictWarning && !isSmartType && <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-center gap-3"><ShieldAlert className="text-amber-400 h-5 w-5" /><span className="text-amber-200 text-xs font-bold">{conflictWarning}</span></div>}
                
                <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden gap-5">
                    <div className="overflow-y-auto pr-2 space-y-5 flex-grow custom-scrollbar">
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('calendar.createModal.eventTitle')}</label><input type="text" required value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} className={formElementClasses} /></div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('calendar.createModal.eventType')}</label><select value={formData.event_type} onChange={(e) => setFormData(prev => ({ ...prev, event_type: e.target.value as CalendarEvent['event_type'] }))} className={formElementClasses}>{Object.keys(t('calendar.types', { returnObjects: true })).map(key => <option key={key} value={key}>{t(`calendar.types.${key}`)}</option>)}</select></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('calendar.createModal.priority')}</label><select value={formData.priority} onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as EventPriority }))} className={formElementClasses}><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option></select></div>
                        </div>
                        
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('calendar.createModal.eventDate')}</label><DatePicker selected={eventDate} onChange={(date: Date | null) => setEventDate(date)} locale={currentLocale} dateFormat="dd.MM.yyyy" placeholderText={t('calendar.createModal.dateTimePlaceholder')} className={formElementClasses} portalId="react-datepicker-portal" required /></div>
                        
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('calendar.createModal.relatedWorkspace')}</label><select value={formData.workspace_id} onChange={(e) => setFormData(prev => ({ ...prev, workspace_id: e.target.value }))} className={formElementClasses}><option value="">{t('calendar.noCaseRelated')}</option>{workspaces.map(w => <option key={w.id} value={w.id}>{w.title || w.workspace_name || w.workspace_number}</option>)}</select></div>
                        
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between cursor-pointer" onClick={() => setIsPublic(!isPublic)}><div className="flex items-center gap-4"><div className={`p-2 rounded-lg ${isPublic ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-400'}`}>{isPublic ? <Eye size={18} /> : <EyeOff size={18} />}</div><div><h4 className={`text-sm font-bold ${isPublic ? 'text-indigo-200' : 'text-gray-400'}`}>{isPublic ? t('calendar.visibilityPublic') : t('calendar.visibilityPrivate')}</h4><p className="text-xs text-gray-500">{isPublic ? t('calendar.visibilityPublicDesc') : t('calendar.visibilityPrivateDesc')}</p></div></div><div className={`w-12 h-6 rounded-full relative transition-colors ${isPublic ? 'bg-indigo-500' : 'bg-gray-700'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-0'}`} /></div></div>
                        
                        {!showAdvanced && <div className="pt-2 text-center"><button type="button" onClick={() => setShowAdvanced(true)} className="text-sm text-blue-400 hover:text-blue-300 flex items-center justify-center mx-auto gap-1"><ChevronDown className="h-4 w-4" />{t('calendar.createModal.addDetails')}</button></div>}
                        
                        {showAdvanced && <div className="space-y-5 pt-4 border-t border-white/10"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('calendar.createModal.description')}</label><textarea rows={3} value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} className={formElementClasses} /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('calendar.createModal.location')}</label><input type="text" value={formData.location} onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))} className={formElementClasses} /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('calendar.createModal.attendees')}</label><input type="text" value={formData.attendees} onChange={(e) => setFormData(prev => ({ ...prev, attendees: e.target.value }))} className={formElementClasses} /></div></div>}
                    </div>
                    <div className="flex space-x-4 pt-6 mt-auto flex-shrink-0 border-t border-white/10">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition font-medium">{t('calendar.createModal.cancel')}</button>
                        <button type="submit" disabled={isCreating} className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-white rounded-xl transition font-bold shadow-lg shadow-blue-600/30">{isCreating ? t('calendar.createModal.creating') : t('calendar.createModal.create')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const transformToUIAgendaItem = (event: CalendarEvent): UIAgendaItem => {
    const isTask = event.event_type === 'TASK';
    return {
        id: getEventId(event),
        title: event.title,
        time: event.is_all_day ? 'All Day' : format(parseISO(event.start_date), 'HH:mm'),
        type: event.event_type,
        priority: event.priority || 'MEDIUM',
        isCompleted: event.status === 'COMPLETED',
        kind: isTask ? 'task' : 'event',
        raw: event 
    };
};

const CalendarPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]); // PHOENIX: Renamed state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<UIAgendaItem | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');
    const [filterPriority, setFilterPriority] = useState<string>('ALL');
    const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
    const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);
    const [isDayModalOpen, setIsDayModalOpen] = useState(false);
    const currentLocale = localeMap[i18n.language] || enUS;

    const loadData = async () => { 
        try { 
            setLoading(true); 
            setError(''); 
            // PHOENIX: Swapped getCases for getWorkspaces
            const [eventsData, workspacesData] = await Promise.all([apiService.getCalendarEvents(), apiService.getWorkspaces()]); 
            setEvents(eventsData); 
            setWorkspaces(workspacesData); // PHOENIX: Renamed state
        } catch (error: any) { 
            setError(error.response?.data?.message || error.message || t('calendar.loadFailure')); 
        } finally { 
            setLoading(false); 
        } 
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        if (!loading && events.length > 0 && location.state) {
            const { openEventId, scrollToToday } = location.state;
            if (openEventId) {
                const eventToOpen = events.find(e => getEventId(e) === openEventId);
                if (eventToOpen) setSelectedEvent(transformToUIAgendaItem(eventToOpen));
            } else if (scrollToToday) {
                setCurrentDate(new Date());
            }
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [loading, events, location, navigate]);
    
    const handleDayClick = (day: Date) => { setSelectedDateForModal(day); setIsDayModalOpen(true); };
    const navigateMonth = (direction: 'prev' | 'next') => { setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1)); };
    
    const filteredEvents = events.filter(event => { 
        const searchContent = `${event.title} ${event.description || ''} ${event.location || ''} ${event.notes || ''}`.toLowerCase(); 
        return searchContent.includes(searchTerm.toLowerCase()) && (filterType === 'ALL' || event.event_type === filterType) && (filterPriority === 'ALL' || event.priority === filterPriority); 
    });
    
    const upcomingAlerts = events.filter(event => {
        if (!['PAYMENT_DUE', 'TAX_DEADLINE'].includes(event.event_type)) return false;
        const eventDate = parseISO(event.start_date); const today = new Date(); today.setHours(0, 0, 0, 0); const sevenDaysFromNow = new Date(today); sevenDaysFromNow.setDate(today.getDate() + 7); sevenDaysFromNow.setHours(23, 59, 59, 999);
        return eventDate >= today && eventDate <= sevenDaysFromNow;
    }).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()).slice(0, 5);
    
    const selectedDayEvents = filteredEvents.filter(e => selectedDateForModal && isSameDay(parseISO(e.start_date), selectedDateForModal));
    
    const handleEventClick = (event: CalendarEvent) => setSelectedEvent(transformToUIAgendaItem(event));

    const renderListView = () => (
        <div className="bg-gray-900/60 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            {filteredEvents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">{t('calendar.noEventsFound')}</div>
            ) : (
                <div className="divide-y divide-white/10">
                    {filteredEvents.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()).map(event => { 
                        const style = getEventStyle(event.event_type); 
                        const isRescheduled = event.notes?.includes('[System]');
                        return (
                            <div key={getEventId(event)} onClick={() => handleEventClick(event)} className="p-5 hover:bg-black/20 cursor-pointer transition-colors flex items-center justify-between group">
                                <div className="flex items-start space-x-5">
                                    <div className="flex-shrink-0 mt-1 text-center min-w-[60px]">
                                        <div className="text-sm text-gray-400 uppercase">{format(parseISO(event.start_date), 'MMM', { locale: currentLocale })}</div>
                                        <div className="text-2xl font-bold text-white">{format(parseISO(event.start_date), 'dd')}</div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">{event.title}</h4>
                                            {isRescheduled && <div className="p-1 bg-blue-500/20 rounded border border-blue-500/50" title="Kujdestari Adjusted"><Zap size={10} className="text-blue-400" /></div>}
                                            {event.is_public && <Eye size={14} className="text-emerald-400" />}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`text-xs px-2.5 py-1 rounded-md border ${style.border} ${style.bg} ${style.text} flex items-center gap-2 font-medium`}>{style.icon} {t(`calendar.types.${event.event_type}`, event.event_type)}</span>
                                            <span className="text-xs text-gray-500 truncate max-w-[200px]">{isRescheduled ? event.notes : (event.description || '')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate); const daysInMonth = getDaysInMonth(currentDate); const weekStartsOn = currentLocale?.options?.weekStartsOn ?? 1; const firstDayOfMonth = getDay(monthStart); const startingDayIndex = (firstDayOfMonth - weekStartsOn + 7) % 7;
        const cellClass = "min-h-[120px] border-r border-b border-white/5 relative group transition-colors hover:bg-black/20 flex flex-col p-2"; const days = Array.from({ length: startingDayIndex }, (_, i) => <div key={`empty-${i}`} className={`${cellClass} bg-black/30`} />);
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day); const dayEvents = filteredEvents.filter(event => isSameDay(parseISO(event.start_date), date)); const today = isTodayFns(date);
          days.push(
            <div key={day} className={`${cellClass} ${today ? 'bg-blue-900/20' : ''}`} onClick={() => handleDayClick(date)}>
              <div className={`text-sm font-bold mb-2 flex justify-between items-center p-1 ${today ? 'text-blue-300' : 'text-gray-400'}`}><span className={`w-8 h-8 flex items-center justify-center rounded-full ${today ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40' : ''}`}>{day}</span></div>
              <div className="flex-1 w-full space-y-1 overflow-visible relative">
                {dayEvents.slice(0, 4).map(event => {
                  const style = getEventStyle(event.event_type); const eventId = getEventId(event); const isHovered = hoveredEventId === eventId;
                  const isRescheduled = event.notes?.includes('[System]');
                  return (
                    <div key={eventId} className="relative w-full">
                        <button onClick={(e) => { e.stopPropagation(); handleEventClick(event); }} onMouseEnter={() => setHoveredEventId(eventId)} onMouseLeave={() => setHoveredEventId(null)} className={`w-full text-left px-2 py-1.5 rounded-md border flex items-center gap-2 transition-all duration-200 shadow-sm ${style.bg} ${style.border} group-hover:shadow-lg ${isHovered ? 'scale-[1.05] z-10 ring-2 ring-white/50' : ''}`}>
                            <div className={`w-2 h-2 rounded-full ${isRescheduled ? 'bg-blue-400 shadow-[0_0_8px_#60a5fa]' : style.indicator}`} />
                            <span className={`text-xs font-bold truncate ${style.text} flex-1`}>{event.title}</span>
                            {isRescheduled && <Zap size={10} className="text-blue-400 ml-auto" />}
                        </button>
                        <AnimatePresence>{isHovered && (<motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 5 }} transition={{ duration: 0.15 }} className="absolute left-0 top-full mt-2 z-[999] w-72 bg-[#1e293b]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl"><div className="absolute -top-1.5 left-4 w-3 h-3 bg-[#1e293b] border-t border-l border-white/10 transform rotate-45" /><div className="relative z-10">
                            <div className={`text-xs font-bold uppercase mb-2 flex items-center gap-2 ${style.text}`}>{style.icon} {t(`calendar.types.${event.event_type}`, event.event_type)}</div>
                            <div className="text-white font-bold text-base mb-2 line-clamp-2 leading-tight">{event.title}</div>
                            {isRescheduled && <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 mb-2"><Info size={14} className="text-blue-400 mt-0.5" /><span className="text-blue-200 text-xs italic">{event.notes}</span></div>}
                            <div className="text-gray-400 text-sm mb-3 line-clamp-2">{event.description || t('general.notAvailable')}</div>
                            <div className="pt-3 border-t border-white/10 text-gray-500 text-xs flex justify-between font-mono"><span>{format(parseISO(event.start_date), 'HH:mm')}</span>{event.priority && <span className="text-blue-400 font-bold tracking-tighter">{event.priority}</span>}</div>
                        </div></motion.div>)}</AnimatePresence>
                    </div>
                  );
                })}
                {dayEvents.length > 4 && (<div className="text-xs text-gray-500 px-1 text-center font-bold hover:text-white transition-colors cursor-pointer mt-1">+{dayEvents.length - 4} {t('calendar.moreEvents')}</div>)}
              </div>
            </div>
          );
        }
        const totalCells = Math.ceil(days.length / 7) * 7; while(days.length < totalCells) days.push(<div key={`empty-end-${days.length}`} className={`${cellClass} bg-black/30`} />);
        const weekStarts = startOfWeek(new Date(), { weekStartsOn }); const weekDays = Array.from({ length: 7 }, (_, i) => format(addDays(weekStarts, i), 'EEEEEE', { locale: currentLocale }));
        return (<div className="bg-gray-900/60 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl overflow-hidden"><div className="grid grid-cols-7 bg-black/30 border-b border-white/10">{weekDays.map(day => <div key={day} className="py-4 text-center text-sm font-bold text-gray-400 uppercase tracking-wider">{day}</div>)}</div><div className="grid grid-cols-7 border-l border-t border-white/5">{days}</div></div>);
    };
    
    if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div></div>;

    return (
        <div className="min-h-screen bg-[#030711] font-sans text-gray-100">
            <div id="react-datepicker-portal"></div>
            <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
                    <div><h1 className="text-4xl font-black text-white flex items-center gap-4"><CalendarIcon className="text-blue-500 h-10 w-10" /><span className="capitalize">{format(currentDate, 'LLLL yyyy', { locale: currentLocale })}</span></h1><p className="text-gray-400 mt-2 ml-14">{t('calendar.pageSubtitle')}</p></div>
                    <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto"><div className="flex items-center bg-gray-900/60 border border-white/10 rounded-2xl p-2"><button onClick={() => navigateMonth('prev')} className="p-3 hover:bg-white/10 rounded-xl transition-colors"><ChevronLeft size={20} /></button><button onClick={() => setCurrentDate(new Date())} className="px-6 py-2 text-sm font-bold hover:bg-white/10 rounded-xl transition-colors">{t('calendar.today')}</button><button onClick={() => navigateMonth('next')} className="p-3 hover:bg-white/10 rounded-xl transition-colors"><ChevronRight size={20} /></button></div><button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-95"><Plus size={20} /> <span className="hidden sm:inline">{t('calendar.newEvent')}</span></button></div>
                </div>
                {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 mb-6 flex items-center space-x-3"><AlertCircle className="h-5 w-5 text-rose-400" /><span className="text-rose-200 text-sm">{error}</span></div>}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    <div className="xl:col-span-3 space-y-6">
                        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-900/60 border border-white/10 rounded-3xl backdrop-blur-md">
                            <div className="relative flex-grow group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" /><input type="text" placeholder={t('calendar.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:border-blue-500/50 outline-none transition-all" /></div>
                            <div className="flex gap-3">
                                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full sm:w-auto px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 cursor-pointer appearance-none"><option value="ALL">{t('calendar.allTypes')}</option>{Object.keys(t('calendar.types', { returnObjects: true })).map(key => <option key={key} value={key}>{t(`calendar.types.${key}`)}</option>)}</select>
                                <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="w-full sm:w-auto px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 cursor-pointer appearance-none"><option value="ALL">{t('calendar.allPriorities')}</option><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option></select>
                                <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10"><button onClick={() => setViewMode('month')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'month' ? 'bg-white text-black shadow' : 'text-gray-400 hover:text-white'}`}>{t('calendar.month')}</button><button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-black shadow' : 'text-gray-400 hover:text-white'}`}>{t('calendar.list')}</button></div>
                            </div>
                        </div>
                        {viewMode === 'month' ? renderMonthView() : renderListView()}
                    </div>
                    <div className="xl:col-span-1 space-y-8">
                        <div className="bg-gray-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Bell size={80} /></div>
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><Bell className="text-amber-400" size={20} />{t('calendar.upcomingAlerts')}</h3>
                            <div className="space-y-4">{upcomingAlerts.length === 0 ? (<p className="text-gray-500 text-sm text-center py-6">{t('calendar.noUpcomingEvents')}</p>) : (upcomingAlerts.map(ev => { const style = getEventStyle(ev.event_type); return (<button key={getEventId(ev)} onClick={() => handleEventClick(ev)} className="w-full flex gap-4 items-start group text-left p-3 rounded-xl hover:bg-white/5 transition-colors"><div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${style.indicator}`} /><div className="min-w-0"><h4 className="text-sm font-bold text-gray-200 group-hover:text-blue-400 transition-colors truncate">{ev.title}</h4><p className="text-xs text-gray-400 mt-1 flex items-center gap-3">{format(parseISO(ev.start_date), 'dd MMM')} <span className={`text-[10px] px-2 py-0.5 rounded-md border ${style.border} ${style.bg} ${style.text} uppercase font-medium`}>{t(`calendar.types.${ev.event_type}`, ev.event_type)}</span></p></div></button>)}))}</div>
                        </div>
                        <div className="bg-gray-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-6">{t('calendar.eventTypes')}</h3>
                            <div className="space-y-3">{Object.keys(t('calendar.types', { returnObjects: true })).map((key) => { const style = getEventStyle(key); return (<div key={key} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setFilterType(filterType === key ? 'ALL' : key)}><div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${style.border} ${style.bg}`}>{style.icon}</div><span className={`text-base font-bold ${filterType === key ? 'text-white' : 'text-gray-400'}`}>{t(`calendar.types.${key}`)}</span>{filterType === key && <div className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse" />}</div>)})}</div>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
              {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onUpdate={loadData} workspaces={workspaces} />}
            </AnimatePresence>
            
            {isCreateModalOpen && <CreateEventModal workspaces={workspaces} existingEvents={events} onClose={() => setIsCreateModalOpen(false)} onCreate={loadData} />}
            <DayEventsModal isOpen={isDayModalOpen} onClose={() => setIsDayModalOpen(false)} date={selectedDateForModal} events={selectedDayEvents} t={t} onAddEvent={() => { setIsDayModalOpen(false); setIsCreateModalOpen(true); }} />
        </div>
    );
};

export default CalendarPage;