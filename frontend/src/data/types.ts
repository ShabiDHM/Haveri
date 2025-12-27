// FILE: src/data/types.ts
// PHOENIX PROTOCOL - TYPES MASTER V19.3
// 1. UPDATED: StrategicBriefingResponse now uses 'staffPerformance' instead of 'liquidity'.
// 2. INTEGRITY: Full file preserved.

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

// --- TACTICAL BRIEFING TYPES (V19.3 STAFF MVP) ---
export interface StrategicBriefingResponse {
    staffPerformance: {
        efficiencyStatus: 'sleep' | 'stable' | 'fire';
        efficiencyScore: number;
        mvpName: string;
        mvpTotal: number;
        mvpInsight: string;
        actionBravo: boolean;
    };
    market: {
        signals: Array<{
            id: number;
            type: 'diaspora' | 'weather' | 'competitor' | 'holiday';
            label: string;
            impact: 'high' | 'medium' | 'low';
            message: string;
            action: string;
        }>;
    };
    agenda: Array<{
        id: string;
        title: string;
        time: string;
        type: 'meeting' | 'payment' | 'deadline' | 'call';
        priority: 'high' | 'medium' | 'low';
        isCompleted: boolean;
    }>;
}

// --- STANDARD FINANCE & INVENTORY ---
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

// --- RESTORED SYSTEM TYPES ---
export interface LoginRequest { username: string; password: string; }
export interface RegisterRequest { email: string; password: string; username: string; }
export interface ChangePasswordRequest { current_password: string; new_password: string; }
export interface UpdateUserRequest { username?: string; email?: string; role?: string; subscription_status?: string; status?: 'active' | 'inactive'; }
export interface CreateCaseRequest { case_number: string; title: string; case_name?: string; description?: string; clientName?: string; clientEmail?: string; clientPhone?: string; status?: string; }
export interface DeletedDocumentResponse { documentId: string; deletedFindingIds: string[]; }
export interface CalendarEventCreateRequest { title: string; description?: string; start_date: string; end_date?: string; is_all_day?: boolean; event_type: string; case_id?: string; location?: string; notes?: string; priority?: string; attendees?: string[]; is_public?: boolean; }
export interface CreateDraftingJobRequest { user_prompt: string; template_id?: string; case_id?: string; context?: string; draft_type?: string; document_type?: string; use_library?: boolean; }
export type DraftingJobStatus = { job_id: string; status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'; error?: string; result_summary?: string; };
export type DraftingJobResult = { document_text: string; document_html?: string; result_text?: string; job_id?: string; status?: string; };
export interface ConflictingParty { party_name: string; core_claim: string; }
export interface ChronologyEvent { date: string; event: string; source_doc?: string; }
export interface CaseAnalysisResult { summary_analysis: string; contradictions: string[]; missing_info: string[]; conflicting_parties?: ConflictingParty[]; key_evidence?: string[]; chronology?: ChronologyEvent[]; silent_parties?: string[]; active_parties?: string[]; analysis_mode?: string; target_document_id?: string; judicial_observation?: string; red_flags?: string[]; suggested_questions?: string[]; discovery_targets?: string[]; risks?: string[]; error?: string; }
export interface GraphNode { id: string; name: string; group: string; val: number; }
export interface GraphLink { source: string; target: string; label: string; }
export interface GraphData { nodes: GraphNode[]; links: GraphLink[]; }