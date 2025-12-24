// FILE: src/types/dailyBriefing.ts
// PHOENIX PROTOCOL - TYPE DEFINITIONS
// Defines the shape of data coming from the AI Agent (Backend).

export interface BriefingMeta {
    generated_at: string;
    agent: string;
}

export interface FinanceItem {
    client: string;
    amount: number;
    status: string;
    invoice_number: string;
}

export interface InventoryItem {
    name: string;
    status: 'CRITICAL' | 'LOW';
    remaining: number;
    prediction: string;
}

export interface CalendarItem {
    title: string;
    time: string;
    type: string;
    location: string;
}

export interface DailyBriefingResponse {
    finance: {
        attention_needed: boolean;
        unpaid_count: number;
        items: FinanceItem[];
    };
    inventory: {
        risk_alert: boolean;
        risk_count: number;
        items: InventoryItem[];
    };
    calendar: {
        event_count: number;
        items: CalendarItem[];
    };
    meta: BriefingMeta;
}