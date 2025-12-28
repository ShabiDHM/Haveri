// FILE: src/hooks/useStrategicBriefing.ts
// PHOENIX PROTOCOL - HOOK V2.6 (MODAL-READY DATA)
// 1. ENHANCEMENT: Added 'fullDate' to AgendaItem interface to pass the complete ISO string to the UI.
// 2. STATUS: Provides all necessary data for the interactive detail modal.

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { StrategicBriefingResponse, CalendarEvent } from '../data/types';

// Enhanced Interface for UI differentiation
export interface AgendaItem {
    id: string;
    title: string;
    time: string;
    fullDate: string; // PHOENIX: Added to provide the modal with the complete date string
    priority: 'high' | 'medium' | 'low';
    isCompleted: boolean;
    kind: 'event' | 'alert';
    originalType: string;
}

interface EnhancedBriefingData extends Omit<StrategicBriefingResponse, 'agenda'> {
    agenda: AgendaItem[];
}

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
            return 'medium';
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

            const todaysItems: AgendaItem[] = calendarResult
                .filter((event: CalendarEvent) => {
                    if (!event.start_date) return false;
                    const eventDate = new Date(event.start_date);
                    return eventDate.getDate() === currentDay &&
                           eventDate.getMonth() === currentMonth &&
                           eventDate.getFullYear() === currentYear;
                })
                .map((event: CalendarEvent): AgendaItem => {
                    const eventDate = new Date(event.start_date);
                    const type = event.event_type?.toUpperCase() || 'TASK';
                    const isAlert = ['PAYMENT_DUE', 'TAX_DEADLINE'].includes(type);
                    const hoursDiff = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

                    let finalPriority = mapApiPriority(event.priority);
                    if (isAlert) finalPriority = 'high';

                    return {
                        id: event.id,
                        title: event.title,
                        time: eventDate.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
                        fullDate: event.start_date, // PHOENIX: Pass the full ISO string
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

            const fallbackAgenda: AgendaItem[] = (briefingResult.agenda || []).map((item: any): AgendaItem => ({
                id: item.id || Math.random().toString(),
                title: item.title,
                time: item.time,
                fullDate: new Date().toISOString(), // Provide a fallback date
                priority: 'medium',
                isCompleted: false,
                kind: 'event',
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