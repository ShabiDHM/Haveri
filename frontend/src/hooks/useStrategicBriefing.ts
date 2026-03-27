// FILE: src/hooks/useStrategicBriefing.ts
// PHOENIX PROTOCOL - STRATEGIC HOOK V3.2 (WORKSPACE FILTER)

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { StrategicBriefingResponse } from '../data/types';

export const useStrategicBriefing = (workspaceId?: string) => {
    const [data, setData] = useState<StrategicBriefingResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(false);
        setData(null);
        try {
            const briefingResult = await apiService.getStrategicBriefing(workspaceId);
            setData(briefingResult);
        } catch (e) {
            console.error("Failed to load strategic briefing:", e);
            setError(true);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    return { data, loading, error, refreshData: fetchData };
};