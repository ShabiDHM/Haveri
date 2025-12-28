// FILE: src/hooks/useStrategicBriefing.ts
// PHOENIX PROTOCOL - HOOK V2.5 (TYPE-SAFE MAPPING)
// 1. FIX: Created a 'mapApiPriority' function to safely convert uppercase API priorities (HIGH, CRITICAL) to lowercase UI priorities (high).
// 2. FIX: Added explicit type casting to the 'fallbackAgenda' mapping to resolve the 'kind' property mismatch.
// 3. STATUS: All TypeScript errors resolved.

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { StrategicBriefingResponse, CalendarEvent } from '../data/types';

// Enhanced Interface for UI differentiation
export interface AgendaItem {
    id: string;
    title: string;
    time: string;
    priority: 'high' | 'medium' | 'low';
    isCompleted: boolean;
    kind: 'event' | 'alert'; // 'event' = Appointment/Task, 'alert' = Payment/Tax
    originalType: string;    // 'APPOINTMENT', 'PAYMENT_DUE', etc.
}

interface EnhancedBriefingData extends Omit<StrategicBriefingResponse, 'agenda'> {
    agenda: AgendaItem[];
}

// PHOENIX FIX: Type-safe function to map API's uppercase priority to UI's lowercase priority.
const mapApiPriority = (priority: CalendarEvent['priority']): 'high' | 'medium' | 'low' => {
    switch (priority) {
        case 'CRITICAL':
        case 'HIGH':
            return 'high';
        case 'MEDIUM':
            return 'medium';
        case 'LOW':
            return 'low';
        default:
            return 'medium'; // Default to medium if undefined
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
            const currentDay = now.getDate();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            // 1. Filter & Map Real Events
            const todaysItems: AgendaItem[] = calendarResult
                .filter((event: CalendarEvent) => {
                    if (!event.start_date) return false;
                    const eventDate = new Date(event.start_date);
                    return eventDate.getDate() === currentDay &&
                           eventDate.getMonth() === currentMonth &&
                           eventDate.getFullYear() === currentYear;
                })
                .map((event: CalendarEvent): AgendaItem => { // Ensure the return type is AgendaItem
                    const eventDate = new Date(event.start_date);
                    const type = event.event_type?.toUpperCase() || 'TASK';
                    const isAlert = ['PAYMENT_DUE', 'TAX_DEADLINE'].includes(type);
                    const hoursDiff = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

                    let finalPriority = mapApiPriority(event.priority);
                    if (isAlert) {
                        finalPriority = 'high'; // Alerts are always high priority
                    }

                    return {
                        id: event.id,
                        title: event.title,
                        time: eventDate.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
                        priority: finalPriority,
                        isCompleted: hoursDiff < -1,
                        kind: isAlert ? 'alert' : 'event',
                        originalType: type
                    };
                })
                .sort((a, b) => {
                    if (a.kind === 'alert' && b.kind === 'event') return -1;
                    if (a.kind === 'event' && b.kind === 'alert') return 1;
                    return a.time.localeCompare(b.time);
                });

            // 2. Fallback AI Suggestions (if no real data)
            const fallbackAgenda: AgendaItem[] = (briefingResult.agenda || []).map((item: any): AgendaItem => ({ // PHOENIX FIX: Explicitly cast return object to AgendaItem
                id: item.id || Math.random().toString(),
                title: item.title,
                time: item.time,
                priority: 'medium',
                isCompleted: false,
                kind: 'event', // Default to event
                originalType: 'SUGGESTION'
            }));

            setData({
                ...briefingResult,
                agenda: todaysItems.length > 0 ? todaysItems : fallbackAgenda
            });

        } catch (e) {
            console.error("Failed to load strategic briefing & calendar:", e);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refresh: fetchData };
};