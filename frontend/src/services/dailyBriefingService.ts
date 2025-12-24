// FILE: src/services/dailyBriefingService.ts
// PHOENIX PROTOCOL - SERVICE FIX V2.2 (CORRECT INSTANCE ACCESS)
// 1. FIX: Imports 'apiService' correctly.
// 2. FIX: Accesses 'apiService.axiosInstance' to make the request.

import { apiService } from './api';
import { DailyBriefingResponse } from '../types/dailyBriefing';

export const dailyBriefingService = {
  getMorningReport: async (): Promise<DailyBriefingResponse> => {
    // Matches the router registration in backend/app/main.py
    // We access the public axiosInstance from your ApiService class
    const response = await apiService.axiosInstance.get<DailyBriefingResponse>('/daily-briefing/');
    return response.data;
  },
};