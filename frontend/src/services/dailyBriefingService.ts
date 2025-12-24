// FILE: src/services/dailyBriefingService.ts
// PHOENIX PROTOCOL - SERVICE V2.3 (STRICT EXPORT)
// 1. IMPORT: Uses 'apiService' from './api'.
// 2. EXPORT: Named export 'dailyBriefingService' to match Component import { ... }.

import { apiService } from './api';
import { DailyBriefingResponse } from '../types/dailyBriefing';

export const dailyBriefingService = {
  getMorningReport: async (): Promise<DailyBriefingResponse> => {
    // Accessing the public axios instance from your Master API class
    const response = await apiService.axiosInstance.get<DailyBriefingResponse>('/daily-briefing/');
    return response.data;
  },
};