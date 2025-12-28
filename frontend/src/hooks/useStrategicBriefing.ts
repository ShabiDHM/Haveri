// FILE: src/hooks/useStrategicBriefing.ts
// PHOENIX PROTOCOL - HOOK V2.2 (STRICT FILTERING)
// 1. FILTERING: Switched to Local Date Comparison (getDate/getMonth/getFullYear) to strictly show TODAY'S events.
// 2. TYPE SAFETY: Maintains Omit<T,K> fix.

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { StrategicBriefingResponse, CalendarEvent } from '../data/types';

// Define the shape required by the UI Component (SmartAgendaCard)
export interface AgendaItem {
    id: string;
    title: string;
    time: string;
    priority: 'high' | 'medium' | 'low';
    isCompleted: boolean;
}

// Omit 'agenda' from the base type to avoid conflicts
interface EnhancedBriefingData extends Omit<StrategicBriefingResponse, 'agenda'> {
    agenda: AgendaItem[];
}

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
            // Store simple numeric values for today's date parts
            const currentDay = now.getDate();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            // 1. Process Real Calendar Events
            const todaysEvents: AgendaItem[] = calendarResult
                .filter((event: CalendarEvent) => {
                    if (!event.start_date) return false;
                    
                    const eventDate = new Date(event.start_date);
                    
                    // PHOENIX FIX: Strict Equality Check (Day, Month, Year must match)
                    // This ignores time/timezone offsets that might push it to "yesterday/tomorrow" in UTC
                    return eventDate.getDate() === currentDay &&
                           eventDate.getMonth() === currentMonth &&
                           eventDate.getFullYear() === currentYear;
                })
                .map((event: CalendarEvent) => {
                    const eventDate = new Date(event.start_date);
                    
                    // Logic: Events within 4 hours are High Priority
                    const hoursDiff = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                    let priority: 'high' | 'medium' | 'low' = 'medium';
                    
                    if (hoursDiff > 0 && hoursDiff < 4) priority = 'high';
                    if (hoursDiff < 0) priority = 'low'; // Past events

                    return {
                        id: event.id,
                        title: event.title,
                        time: eventDate.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
                        priority: priority,
                        isCompleted: hoursDiff < -1 // Mark as completed if 1 hour passed
                    };
                })
                .sort((a, b) => a.time.localeCompare(b.time));

            // 2. Fallback only if no events exist
            const fallbackAgenda: AgendaItem[] = (briefingResult.agenda || []).map((item: any) => ({
                id: item.id || Math.random().toString(),
                title: item.title,
                time: item.time,
                priority: 'medium',
                isCompleted: false
            }));

            // If we have real events for today, use them. Otherwise, show AI suggestions.
            const finalAgenda = todaysEvents.length > 0 ? todaysEvents : fallbackAgenda;

            setData({
                ...briefingResult,
                agenda: finalAgenda
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