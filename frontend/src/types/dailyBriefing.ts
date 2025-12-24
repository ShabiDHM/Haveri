// FILE: src/types/dailyBriefing.ts
// PHOENIX PROTOCOL - TYPE DEFINITIONS V2.0
// 1. ADDED: 'revenue_yesterday' to Finance section.
// 2. ADDED: 'top_product' to Inventory section.

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
        revenue_yesterday: number; // <--- V2.0 FIELD
    };
    inventory: {
        risk_alert: boolean;
        risk_count: number;
        items: InventoryItem[];
        top_product: string; // <--- V2.0 FIELD
    };
    calendar: {
        event_count: number;
        items: CalendarItem[];
    };
    meta: BriefingMeta;
}