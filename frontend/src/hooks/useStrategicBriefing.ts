// FILE: src/hooks/useStrategicBriefing.ts
// PHOENIX PROTOCOL - TYPE CONSISTENCY V3.5
// 1. FIX: Standardized 'event_type' to 'type' in the final UIAgendaItem object to match the modal's expectation.

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { StrategicBriefingResponse, CalendarEvent } from '../data/types';

export interface UIAgendaItem {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    is_all_day: boolean;
    status: CalendarEvent['status'];
    type: CalendarEvent['event_type']; // Standardized to 'type'
    attendees?: string[];
    location?: string;
    notes?: string;
    case_id?: string;
    time: string;
    priority: 'high' | 'medium' | 'low';
    isCompleted: boolean;
    kind: 'event' | 'alert';
    raw: CalendarEvent;
}

interface EnhancedBriefingData extends Omit<StrategicBriefingResponse, 'agenda'> {
    agenda: UIAgendaItem[];
}

const mapApiPriority = (priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'): 'high' | 'medium' | 'low' => {
    switch (priority) {
        case 'CRITICAL': case 'HIGH': return 'high';
        case 'MEDIUM': return 'medium';
        case 'LOW': return 'low';
        default: return 'medium';
    }
};

export const useStrategicBriefing = () => {
    const [data, setData] = useState<EnhancedBriefingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const [briefingResult, calendarResult] = await Promise.all([
                apiService.getStrategicBriefing(),
                apiService.getCalendarEvents()
            ]);

            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const todaysEvents: UIAgendaItem[] = calendarResult
                .filter((event: CalendarEvent) => {
                    if (!event.start_date) return false;
                    const eventDate = new Date(event.start_date);
                    return eventDate >= todayStart && eventDate < new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
                })
                .map((event: CalendarEvent): UIAgendaItem => {
                    const eventDate = new Date(event.start_date);
                    const eventType = event.event_type?.toUpperCase() as UIAgendaItem['type'] || 'TASK';
                    const isAlert = ['PAYMENT_DUE', 'TAX_DEADLINE'].includes(eventType);
                    const hoursDiff = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                    let finalPriority = mapApiPriority(event.priority);
                    if (isAlert) finalPriority = 'high';

                    return {
                        id: event.id, title: event.title, description: event.description,
                        start_date: event.start_date, end_date: event.end_date, is_all_day: event.is_all_day,
                        status: event.status, 
                        type: event.event_type, // PHOENIX: Standardized to 'type'
                        attendees: event.attendees,
                        location: event.location, notes: event.notes, case_id: event.case_id,
                        time: eventDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                        priority: finalPriority, isCompleted: hoursDiff < -1, kind: isAlert ? 'alert' : 'event',
                        raw: event, 
                    };
                })
                .sort((a, b) => a.time.localeCompare(b.time));

            setData({ ...briefingResult, agenda: todaysEvents });

        } catch (e) {
            console.error("Failed to load strategic briefing & calendar:", e);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    return { data, loading, error, refreshData: fetchData };
};