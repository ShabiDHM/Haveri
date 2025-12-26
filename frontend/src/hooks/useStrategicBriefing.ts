// FILE: src/hooks/useStrategicBriefing.ts
// PHOENIX PROTOCOL - HOOK V1.0 (STRATEGIC BRIEFING)
// Fetches the generative daily briefing data.

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
        try {
            const result = await apiService.getStrategicBriefing();
            setData(result);
        } catch (e) {
            console.error("Failed to load strategic briefing:", e);
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