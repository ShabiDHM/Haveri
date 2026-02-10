// FILE: src/data/types.ts
// PHOENIX PROTOCOL - TYPES V4.2 (AI INSIGHTS INTEGRATION)
// 1. ADDED: RestockPrediction and SalesTrendAnalysis interfaces for inventory intelligence.
// 2. STATUS: Fully synchronized with Backend V4.4 and Modals V3.0.

export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';
export type EventPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

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
    organization_id?: string;
    organization_role?: 'OWNER' | 'MEMBER' | 'VIEWER';
    organization_name?: string;
    logo?: string;
    plan_tier?: 'SOLO' | 'STARTUP' | 'GROWTH' | 'ENTERPRISE';
    subscription_expiry_date?: string;
}

export type AdminUser = User;

export interface Partner {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    tax_id?: string;
    type: 'CLIENT' | 'SUPPLIER';
    created_at: string;
}

export interface Workspace { 
    id: string; 
    workspace_number: string; 
    workspace_name: string; 
    title: string; 
    status: 'ACTIVE' | 'ARCHIVED' | 'PENDING'; 
    client?: { name: string; phone: string; email: string; }; 
    description: string; 
    created_at: string; 
    updated_at: string; 
    tags: string[]; 
    document_count?: number; 
    alert_count?: number; 
    event_count?: number; 
    is_shared?: boolean; 
}

export interface Document { 
    id: string; 
    file_name: string; 
    file_type: string; 
    mime_type?: string; 
    storage_key: string; 
    uploaded_by: string; 
    created_at: string; 
    status: 'UPLOADING' | 'PENDING' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'FAILED'; 
    summary?: string; 
    risk_score?: number; 
    ocr_status?: string; 
    processed_text_storage_key?: string; 
    preview_storage_key?: string; 
    error_message?: string; 
    progress_percent?: number; 
    progress_message?: string; 
    is_shared?: boolean; 
}

export interface CalendarEvent { 
    id: string; 
    title: string; 
    description?: string; 
    start_date: string; 
    end_date: string; 
    is_all_day: boolean; 
    event_type: 'APPOINTMENT' | 'TASK' | 'PAYMENT_DUE' | 'TAX_DEADLINE' | 'PERSONAL' | 'OTHER'; 
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE' | 'ARCHIVED'; 
    workspace_id?: string; 
    document_id?: string; 
    location?: string; 
    notes?: string; 
    priority?: EventPriority; 
    attendees?: string[]; 
    is_public?: boolean; 
}

export interface UIAgendaItem { 
    id: string; 
    title: string; 
    description?: string; 
    start_date: string; 
    end_date: string; 
    is_all_day: boolean; 
    status: CalendarEvent['status']; 
    type: CalendarEvent['event_type']; 
    attendees?: string[]; 
    location?: string; 
    notes?: string; 
    workspace_id?: string; 
    time: string; 
    priority: EventPriority; 
    isCompleted: boolean; 
    kind: 'event' | 'alert' | 'task'; 
    raw: any; 
}

export interface BusinessProfile { id: string; firm_name: string; address?: string; city?: string; phone?: string; email_public?: string; website?: string; tax_id?: string; branding_color: string; logo_url?: string; is_complete: boolean; vat_rate?: number; target_margin?: number; currency?: string; }
export interface BusinessProfileUpdate { firm_name?: string; address?: string; city?: string; phone?: string; email_public?: string; website?: string; tax_id?: string; branding_color?: string; vat_rate?: number; target_margin?: number; currency?: string; }

export interface StrategicBriefingResponse { 
    staffPerformance: { 
        efficiencyStatus: 'sleep' | 'stable' | 'fire'; 
        efficiencyScore: number; 
        mvpName: string; 
        mvpTotal: number; 
        mvpInsight: { key: string; values?: Record<string, string | number>; }; 
        actionBravo: boolean; 
    }; 
    market: { 
        signals: Array<{ 
            id: number; 
            type: 'bestseller' | 'low_stock' | 'diaspora' | 'weather' | 'competitor' | 'holiday'; 
            label: string; 
            impact: 'high' | 'medium' | 'low'; 
            message: string; 
            action: string; 
        }>; 
    }; 
    agenda: UIAgendaItem[]; 
}

// PHOENIX: ADDED AI INTERFACES
export interface RestockPrediction {
    suggested_quantity: number;
    reason: string;
    supplier_name?: string;
    estimated_cost: number;
}
export interface SalesTrendAnalysis {
    trend_analysis: string;
    cross_sell_opportunities: string;
}

export interface InvoiceItem { description: string; quantity: number; unit_price: number; total: number; }
export interface Invoice { id: string; invoice_number: string; client_name: string; client_email?: string; client_address?: string; issue_date: string; due_date: string; items: InvoiceItem[]; subtotal: number; tax_rate: number; tax_amount: number; total_amount: number; currency: string; status: 'DRAFT' | 'SENT' | 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED'; notes?: string; related_workspace_id?: string; }
export interface InvoiceCreateRequest { client_name: string; client_email?: string; client_address?: string; items: InvoiceItem[]; tax_rate: number; due_date?: string; notes?: string; related_workspace_id?: string; status?: string; }

export interface Expense { id: string; category: string; amount: number; description?: string; date: string; currency: string; receipt_url?: string; related_workspace_id?: string; source_archive_id?: string; }
export interface ExpenseCreateRequest { category: string; amount: number; description?: string; date?: string; related_workspace_id?: string; source_archive_id?: string; }
export interface ExpenseUpdate { category?: string; amount?: number; description?: string; date?: string; related_workspace_id?: string; source_archive_id?: string; }

export interface WorkspaceFinancialSummary { workspace_id: string; workspace_title: string; workspace_number: string; total_billed: number; total_expenses: number; net_balance: number; }

export interface SalesTrendPoint { date: string; amount: number; count: number; }
export interface TopProductItem { product_name: string; total_quantity: number; total_revenue: number; }
export interface AnalyticsDashboardData { total_revenue_period: number; total_transactions_period: number; sales_trend: SalesTrendPoint[]; top_products: TopProductItem[]; total_profit_period?: number; }

export interface ArchiveItemOut { id: string; title: string; file_type: string; category: string; storage_key: string; file_size: number; created_at: string; workspace_id?: string; parent_id?: string; item_type?: 'FILE' | 'FOLDER'; is_shared?: boolean; indexing_status?: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED'; }

export interface PosTransaction { id: string; product_name: string; quantity: number; total_price: number; transaction_date: string; payment_method: string; }
export interface InventoryItem { _id: string; name: string; unit: string; current_stock: number; cost_per_unit: number; low_stock_threshold: number; }
export interface InventoryItemCreate { name: string; unit: string; current_stock: number; cost_per_unit: number; low_stock_threshold?: number; }

export interface Ingredient { inventory_item_id: string; quantity_required: number; }
export interface Recipe { _id: string; product_name: string; ingredients: Ingredient[]; }
export interface RecipeCreate { product_name: string; ingredients: Ingredient[]; }
export interface RecipeImportResult { recipes_created: number; missing_ingredients: string[]; }

export interface LoginRequest { username: string; password: string; }
export interface RegisterRequest { email: string; password: string; username: string; full_name?: string; }
export interface ChangePasswordRequest { current_password: string; new_password: string; }

export interface UpdateUserRequest { 
    username?: string; 
    email?: string; 
    role?: string; 
    subscription_status?: string; 
    status?: 'active' | 'inactive';
    plan_tier?: string;
    subscription_expiry_date?: string;
}

export interface InviteUserRequest { email: string; role: 'MEMBER' | 'VIEWER' | 'ADMIN'; }

export interface CreateWorkspaceRequest { 
    workspace_number: string; 
    title: string; 
    workspace_name?: string; 
    description?: string; 
    clientName?: string; 
    clientEmail?: string; 
    clientPhone?: string; 
    status?: string; 
}

export interface DeletedDocumentResponse { documentId: string; deletedFindingIds: string[]; }

export interface CalendarEventCreateRequest { 
    title: string; 
    description?: string; 
    start_date: string; 
    end_date?: string; 
    is_all_day?: boolean; 
    event_type: CalendarEvent['event_type']; 
    workspace_id?: string; 
    location?: string; 
    notes?: string; 
    priority?: EventPriority; 
    attendees?: string[]; 
    is_public?: boolean; 
}

export interface GraphNode { 
    id: string | number; 
    label: string; 
    group: 'Client' | 'Invoice' | 'Expense' | 'Document' | 'Workspace' | 'Default' | 'Inventory' | 'Product'; 
    value?: number; 
    currency?: string; 
    status?: 'Active' | 'Paid' | 'Unpaid' | 'Overdue' | 'Draft' | 'Pending'; 
    color?: string; 
    icon?: string; 
    subLabel?: string; 
    meta?: Record<string, any>; 
    x?: number; y?: number; fx?: number; fy?: number; 
}

export interface GraphLink { source: string | number | GraphNode; target: string | number | GraphNode; label?: string; value?: number; type?: 'transaction' | 'ownership' | 'reference'; }
export interface GraphData { nodes: GraphNode[]; links: GraphLink[]; }

export interface Anomaly { type: string; severity: 'low' | 'medium' | 'high'; description: string; row_id: number; }
export interface ChartItem { label: string; value: number; }

export interface AnalysisResult {
    ai_summary: {
        summary: string;
        primary_risk: string;
        key_recommendation: string;
    };
    stats: {
        total_sum: number;
        transaction_count: number;
        average: number;
    };
    chart_data: ChartItem[];
    anomalies: Anomaly[];
}