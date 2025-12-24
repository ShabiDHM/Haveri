// FILE: src/types/dailyBriefing.ts
// PHOENIX PROTOCOL - TYPE DEFINITIONS V3.1 (FULL & COMPLETE)
// 1. INCLUDES: All proactive fields (revenue, top product).
// 2. INCLUDES: Calendar alert flags.
// 3. STATUS: Fully synchronized with backend service logic.

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
    time: string; // ISO Date String
    type: string;
    location: string;
    is_alert?: boolean; // Optional: True if it's an urgent deadline/alert
}

export interface DailyBriefingResponse {
    finance: {
        attention_needed: boolean;
        unpaid_count: number;
        items: FinanceItem[];
        revenue_yesterday: number; // Proactive Metric
    };
    inventory: {
        risk_alert: boolean;
        risk_count: number;
        items: InventoryItem[];
        top_product: string; // Proactive Insight
    };
    calendar: {
        event_count: number;
        items: CalendarItem[];
    };
    meta: BriefingMeta;
}