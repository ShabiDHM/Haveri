// FILE: src/hooks/useStrategicBriefing.ts
// PHOENIX PROTOCOL - STRATEGIC HOOK V2.1 (DATA CONTRACT FIX)
// 1. FIX: Reverted to the full UIAgendaItem interface to match the modal's expectations.
// 2. FIX: Maintained the critical setData(null) logic to prevent stale data.

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { StrategicBriefingResponse, CalendarEvent } from '../data/types';

// PHOENIX FIX: This is the full, correct interface the application expects
export interface UIAgendaItem {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    is_all_day: boolean;
    status: CalendarEvent['status'];
    type: CalendarEvent['event_type'];
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

export const useStrategicBriefing = () => {
    const [data, setData] = useState<EnhancedBriefingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(false);
        setData(null); // Prevent stale data
        
        try {
            // The backend now returns the complete, correct data structure
            const briefingResult = await apiService.getStrategicBriefing();
            setData(briefingResult as EnhancedBriefingData);

        } catch (e) {
            console.error("Failed to load strategic briefing:", e);
            setError(true);
            setData(null); // Clear data on error
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    return { data, loading, error, refreshData: fetchData };
};