// FILE: src/components/DayEventsModal.tsx
// PHOENIX PROTOCOL - TYPE ALIGNMENT V3.0 (UNIFIED ADMIN AESTHETIC)
// UPDATED: Uses unified border styling

import React from 'react';
import { motion } from 'framer-motion';
import { X, Clock, MapPin, Calendar, Plus } from 'lucide-react';
import { CalendarEvent } from '../data/types';
import { TFunction } from 'i18next';

interface DayEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  events: CalendarEvent[];
  t: TFunction;
  onAddEvent: () => void;
}

const priorityColors = {
  CRITICAL: 'bg-danger',
  HIGH: 'bg-warning-start',
  MEDIUM: 'bg-primary',
  LOW: 'bg-text-muted',
};

const DayEventsModal: React.FC<DayEventsModalProps> = ({ 
  isOpen, onClose, date, events, t, onAddEvent 
}) => {
  if (!isOpen || !date) return null;

  const dateString = date.toLocaleDateString(undefined, { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-glass backdrop-blur-xl border border-border-strong rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="p-6 border-b border-border-strong bg-surface/30 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-text-primary capitalize">{dateString}</h2>
            <p className="text-sm text-text-muted mt-1">
              {events.length} {t('calendar.moreEvents', 'Ngjarje')}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-hover text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
              <Calendar className="w-12 h-12 text-text-muted mb-3" />
              <p className="text-text-muted">{t('calendar.noEventsFound', 'Nuk ka ngjarje për këtë datë.')}</p>
            </div>
          ) : (
            events.map((event) => (
              <div 
                key={event.id} 
                className="bg-surface/30 border border-border-strong hover:border-border-strong rounded-xl p-4 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1.5 w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${priorityColors[event.priority as keyof typeof priorityColors] || 'bg-text-muted'}`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-text-primary font-semibold text-sm mb-1">{event.title}</h3>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center text-xs text-text-muted">
                            <Clock size={12} className="mr-1.5" />
                            {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {event.location && (
                            <div className="flex items-center text-xs text-text-muted">
                                <MapPin size={12} className="mr-1.5" />
                                {event.location}
                            </div>
                        )}
                        {event.description && (
                            <p className="text-xs text-text-muted mt-1 line-clamp-2">{event.description}</p>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-border-strong bg-surface/30 shrink-0 flex gap-3">
            <button 
                onClick={onAddEvent}
                className="flex-1 btn-primary py-3 rounded-xl text-sm flex items-center justify-center gap-2"
            >
                <Plus size={16} />
                {t('calendar.newEvent', 'Shto Ngjarje')}
            </button>
        </div>
      </motion.div>
    </div>
  );
};

export default DayEventsModal;