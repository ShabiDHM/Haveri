// FILE: src/hooks/useStrategicBriefing.ts
// PHOENIX PROTOCOL - STRATEGIC HOOK V3.0 (TYPE UNIFICATION)
// 1. FIX: Removed local 'UIAgendaItem' definition to resolve TS2352/TS2322.
// 2. SYNC: Now strictly imports types from 'src/data/types.ts'.
// 3. STATUS: Unblocks Vercel build by removing type shadowing.

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { StrategicBriefingResponse } from '../data/types';

export const useStrategicBriefing = () => {
    const [data, setData] = useState<StrategicBriefingResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(false);
        setData(null); // PHOENIX: Prevent stale data display during refresh
        
        try {
            // The backend returns StrategicBriefingResponse which already 
            // contains the unified UIAgendaItem[] array.
            const briefingResult = await apiService.getStrategicBriefing();
            setData(briefingResult);

        } catch (e) {
            console.error("Failed to load strategic briefing:", e);
            setError(true);
            setData(null); // Clear data on error for safety
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    return { data, loading, error, refreshData: fetchData };
};