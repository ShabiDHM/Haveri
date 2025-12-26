// FILE: src/data/types.ts
// PHOENIX PROTOCOL - TYPES MASTER V18.0 (STRATEGIC BRIEFING)
// 1. ADDED: Interfaces for the new generative Strategic Briefing module.
// 2. STATUS: Production Ready.

export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';

export interface User { 
    id: string; 
    email: string; 
    username: string; 
    role: 'ADMIN' | 'LAWYER' | 'CLIENT'; 
    status: 'active' | 'inactive'; 
    created_at: string; 
    token?: string; 
    subscription_status?: string; 
    business_profile?: BusinessProfile;
}
export type AdminUser = User;

export interface Case { id: string; case_number: string; case_name: string; title: string; status: 'open' | 'closed' | 'pending' | 'archived'; client?: { name: string; phone: string; email: string; }; opposing_party?: { name: string; lawyer: string; }; court_info?: { name: string; judge: string; }; description: string; created_at: string; updated_at: string; tags: string[]; chat_history?: ChatMessage[]; document_count?: number; alert_count?: number; event_count?: number; is_shared?: boolean; }
export interface Document { id: string; file_name: string; file_type: string; mime_type?: string; storage_key: string; uploaded_by: string; created_at: string; status: 'UPLOADING' | 'PENDING' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'FAILED'; summary?: string; risk_score?: number; ocr_status?: string; processed_text_storage_key?: string; preview_storage_key?: string; error_message?: string; progress_percent?: number; progress_message?: string; is_shared?: boolean; }
export interface ChatMessage { role: 'user' | 'ai'; content: string; timestamp: string; }
export interface CalendarEvent { id: string; title: string; description?: string; start_date: string; end_date: string; is_all_day: boolean; event_type: 'HEARING' | 'DEADLINE' | 'MEETING' | 'OTHER' | 'FILING' | 'COURT_DATE' | 'CONSULTATION'; status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE' | 'ARCHIVED'; case_id?: string; document_id?: string; location?: string; notes?: string; priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'; attendees?: string[]; is_public?: boolean; }

// --- BUSINESS PROFILE ---
export interface BusinessProfile { 
    id: string; 
    firm_name: string; 
    address?: string; 
    city?: string; 
    phone?: string; 
    email_public?: string; 
    website?: string; 
    tax_id?: string; 
    branding_color: string; 
    logo_url?: string; 
    is_complete: boolean;
    vat_rate?: number;
    target_margin?: number;
    currency?: string;
}

export interface BusinessProfileUpdate { 
    firm_name?: string; 
    address?: string; 
    city?: string; 
    phone?: string; 
    email_public?: string; 
    website?: string; 
    tax_id?: string; 
    branding_color?: string;
    vat_rate?: number;
    target_margin?: number;
    currency?: string;
}

// --- STRATEGIC BRIEFING TYPES ---
export interface GenerativeMemo {
    observation: string;
    implication: string;
    recommendation: {
        title: string;
        script?: string;
        social_post?: string;
    };
}

export interface DealRiskAnalyzerData {
    monthlyFixedCosts: number;
    currentReceivables: number;
}

export interface SmartAgendaEvent {
    title: string;
    time: string;
    financialContext?: string;
    relatedDocuments?: { id: string; name: string }[];
    generativeAdvice: GenerativeMemo;
}

export interface SmartAgendaMission {
    missionType: 'FINANCIAL' | 'STRATEGIC' | 'RELATIONSHIP';
    generativeMission: GenerativeMemo;
}

export interface StrategicBriefingResponse {
    dealRiskAnalyzer: DealRiskAnalyzerData;
    profitOptimizer: GenerativeMemo;
    smartAgenda: {
        isBusy: boolean;
        events?: SmartAgendaEvent[];
        mission?: SmartAgendaMission;
    };
}

// --- STANDARD FINANCE & INVENTORY ---
// ... (rest of your types)
export interface InvoiceItem { description: string; quantity: number; unit_price: number; total: number; }
export interface Invoice { id: string; invoice_number: string; client_name: string; client_email?: string; client_address?: string; issue_date: string; due_date: string; items: InvoiceItem[]; subtotal: number; tax_rate: number; tax_amount: number; total_amount: number; currency: string; status: 'DRAFT' | 'SENT' | 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED'; notes?: string; related_case_id?: string; }
export interface InvoiceCreateRequest { client_name: string; client_email?: string; client_address?: string; items: InvoiceItem[]; tax_rate: number; due_date?: string; notes?: string; related_case_id?: string; status?: string; }
export interface Expense { id: string; category: string; amount: number; description?: string; date: string; currency: string; receipt_url?: string; related_case_id?: string; }
export interface ExpenseCreateRequest { category: string; amount: number; description?: string; date?: string; related_case_id?: string; }
export interface ExpenseUpdate { category?: string; amount?: number; description?: string; date?: string; related_case_id?: string; }
export interface CaseFinancialSummary { case_id: string; case_title: string; case_number: string; total_billed: number; total_expenses: number; net_balance: number; }
export interface SalesTrendPoint { date: string; amount: number; }
export interface TopProductItem { product_name: string; total_quantity: number; total_revenue: number; }
export interface AnalyticsDashboardData { total_revenue_period: number; total_transactions_period: number; sales_trend: SalesTrendPoint[]; top_products: TopProductItem[]; total_profit_period?: number; }
export interface ArchiveItemOut { id: string; title: string; file_type: string; category: string; storage_key: string; file_size: number; created_at: string; case_id?: string; parent_id?: string; item_type?: 'FILE' | 'FOLDER'; is_shared?: boolean; }
export interface PosTransaction { id: string; product_name: string; quantity: number; total_price: number; transaction_date: string; payment_method: string; }
export interface InventoryItem { _id: string; name: string; unit: string; current_stock: number; cost_per_unit: number; low_stock_threshold: number; }
export interface InventoryItemCreate { name: string; unit: string; current_stock: number; cost_per_unit: number; low_stock_threshold?: number; }
export interface Ingredient { inventory_item_id: string; quantity_required: number; }
export interface Recipe { _id: string; product_name: string; ingredients: Ingredient[]; }
export interface RecipeCreate { product_name: string; ingredients: Ingredient[]; }
export interface RecipeImportResult { recipes_created: number; missing_ingredients: string[]; }