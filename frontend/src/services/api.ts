// FILE: src/services/api.ts
// PHOENIX PROTOCOL - API V10.4 (STORAGE SYNC FIX)
// 1. FIXED: TokenManager now automatically syncs with localStorage.
// 2. RESOLVED: '401 Unauthorized' loop on page reload due to stale storage.
// 3. STATUS: Fully synchronized.

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError, AxiosHeaders } from 'axios';
import type {
    LoginRequest, RegisterRequest, Case, CreateCaseRequest, Document, User, UpdateUserRequest,
    DeletedDocumentResponse, CalendarEvent, CalendarEventCreateRequest, CreateDraftingJobRequest,
    DraftingJobStatus, DraftingJobResult, ChangePasswordRequest,
    BusinessProfile, BusinessProfileUpdate, Invoice, InvoiceCreateRequest, InvoiceItem,
    ArchiveItemOut, CaseFinancialSummary, AnalyticsDashboardData, Expense, ExpenseCreateRequest, ExpenseUpdate,
    InventoryItem, InventoryItemCreate, Recipe, RecipeCreate, PosTransaction,
    StrategicBriefingResponse, InviteUserRequest,
    GraphData,
    AnalysisResult
} from '../data/types';

export interface DailyBriefingResponse { id: string; content: string; created_at: string; tasks_summary?: string; }
export interface AuditIssue { id: string; severity: 'CRITICAL' | 'WARNING'; message: string; related_item_id?: string; item_type?: 'INVOICE' | 'EXPENSE'; }
export interface TaxCalculation { period_month: number; period_year: number; total_sales_gross: number; total_purchases_gross: number; vat_collected: number; vat_deductible: number; net_obligation: number; currency: string; status: string; regime: string; tax_rate_applied: string; description: string; }
export interface WizardState { calculation: TaxCalculation; issues: AuditIssue[]; ready_to_close: boolean; }
export interface InvoiceUpdate { client_name?: string; client_email?: string; client_address?: string; items?: InvoiceItem[]; tax_rate?: number; due_date?: string; status?: string; notes?: string; }
export interface ImportPreviewResponse { filename: string; headers: string[]; sample_data: Record<string, string>[]; total_rows_estimated: number; }
export interface ImportResult { status: string; imported_count: number; total_value: number; batch_id: string; }
export interface RecipeImportResult { recipes_created: number; missing_ingredients: string[]; }
export interface InventoryImportResult { items_created: number; count?: number; }
interface LoginResponse { access_token: string; }
interface DocumentContentResponse { text: string; }
export interface TaxAuditResult { anomalies: string[]; status: 'CLEAR' | 'WARNING' | 'CRITICAL'; net_obligation: number; }
export interface RestockPrediction { suggested_quantity: number; reason: string; supplier_name?: string; estimated_cost?: number; }
export interface SalesTrendAnalysis { trend_analysis: string; cross_sell_opportunities: string; }
export interface KpiInsightResponse { summary: string; key_contributors: string[]; }
export interface GeneralInsightResponse { insight: string; sentiment: 'positive' | 'negative' | 'neutral'; }

// PHOENIX: Centralized Storage Key
export const AUTH_TOKEN_KEY = 'haveri_access_token';

const getBaseUrl = (): string => { if (typeof window !== 'undefined') { const hostname = window.location.hostname; if (hostname === 'www.haveri.tech' || hostname === 'haveri.tech') { return 'https://api.haveri.tech'; } } return 'http://localhost:8000'; };
const normalizedUrl = getBaseUrl();
export const API_BASE_URL = normalizedUrl;
export const API_V1_URL = `${API_BASE_URL}/api/v1`;
export const API_V2_URL = `${API_BASE_URL}/api/v2`;

// PHOENIX: Upgraded TokenManager with Storage Persistence
class TokenManager { 
    private accessToken: string | null = null; 
    
    constructor() {
        if (typeof window !== 'undefined') {
            this.accessToken = localStorage.getItem(AUTH_TOKEN_KEY);
        }
    }

    get(): string | null { 
        if (!this.accessToken && typeof window !== 'undefined') {
            this.accessToken = localStorage.getItem(AUTH_TOKEN_KEY);
        }
        return this.accessToken; 
    } 
    
    set(token: string | null): void { 
        this.accessToken = token; 
        if (typeof window !== 'undefined') {
            if (token) {
                localStorage.setItem(AUTH_TOKEN_KEY, token);
            } else {
                localStorage.removeItem(AUTH_TOKEN_KEY);
            }
        }
    } 
}
const tokenManager = new TokenManager();

class ApiService {
    public axiosInstance: AxiosInstance;
    public onUnauthorized: (() => void) | null = null;
    private isRefreshing = false;
    private failedQueue: { resolve: (value: any) => void; reject: (reason?: any) => void; }[] = [];

    constructor() { this.axiosInstance = axios.create({ baseURL: API_V1_URL, withCredentials: true }); this.setupInterceptors(); }
    public setLogoutHandler(handler: () => void) { this.onUnauthorized = handler; }
    private processQueue(error: Error | null) { this.failedQueue.forEach(prom => { if (error) prom.reject(error); else prom.resolve(tokenManager.get()); }); this.failedQueue = []; }
    private setupInterceptors() {
        this.axiosInstance.interceptors.request.use((config) => { const token = tokenManager.get(); if (!config.headers) config.headers = new AxiosHeaders(); if (token) { if (config.headers instanceof AxiosHeaders) config.headers.set('Authorization', `Bearer ${token}`); else (config.headers as any).Authorization = `Bearer ${token}`; } return config; }, (error) => Promise.reject(error));
        this.axiosInstance.interceptors.response.use((response) => response, async (error: AxiosError) => {
            const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
            if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
                if (this.isRefreshing) { return new Promise((resolve, reject) => { this.failedQueue.push({ resolve, reject }); }).then((token) => { if (originalRequest.headers instanceof AxiosHeaders) { originalRequest.headers.set('Authorization', `Bearer ${token}`); } else { (originalRequest.headers as any).Authorization = `Bearer ${token}`; } return this.axiosInstance(originalRequest); }); }
                originalRequest._retry = true; this.isRefreshing = true;
                try { 
                    const { data } = await this.axiosInstance.post<LoginResponse>('/auth/refresh'); 
                    // PHOENIX: This set() call now automatically updates localStorage
                    tokenManager.set(data.access_token); 
                    if (originalRequest.headers instanceof AxiosHeaders) { originalRequest.headers.set('Authorization', `Bearer ${data.access_token}`); } else { (originalRequest.headers as any).Authorization = `Bearer ${data.access_token}`; } this.processQueue(null); return this.axiosInstance(originalRequest); 
                } catch (refreshError) { 
                    tokenManager.set(null); 
                    this.processQueue(refreshError as Error); 
                    if (this.onUnauthorized) this.onUnauthorized(); 
                    return Promise.reject(refreshError); 
                } finally { this.isRefreshing = false; }
            }
            return Promise.reject(error);
        });
    }
    public setToken(token: string | null): void { tokenManager.set(token); }
    public getToken(): string | null { return tokenManager.get(); }
    public async refreshToken(): Promise<boolean> { try { const response = await this.axiosInstance.post<LoginResponse>('/auth/refresh'); if (response.data.access_token) { tokenManager.set(response.data.access_token); return true; } return false; } catch (error) { console.warn("[API] Session Refresh Failed:", error); return false; } }
    
    // --- AUTH & USER ---
    public async login(data: LoginRequest): Promise<LoginResponse> { const response = await this.axiosInstance.post<LoginResponse>('/auth/login', data); if (response.data.access_token) tokenManager.set(response.data.access_token); return response.data; }
    public logout() { tokenManager.set(null); }
    public async register(data: RegisterRequest): Promise<void> { await this.axiosInstance.post('/auth/register', data); }
    public async fetchUserProfile(): Promise<User> { const response = await this.axiosInstance.get<User>('/users/me'); return response.data; }
    public async changePassword(data: ChangePasswordRequest): Promise<void> { await this.axiosInstance.post('/auth/change-password', data); }
    public async deleteAccount(): Promise<void> { await this.axiosInstance.delete('/users/me'); }

    // --- PHOENIX: TEAM MANAGEMENT ---
    public async inviteUser(data: InviteUserRequest): Promise<any> { const response = await this.axiosInstance.post('/users/invite', data); return response.data; }
    public async getTeamMembers(): Promise<User[]> { const response = await this.axiosInstance.get<User[]>('/users/team'); return response.data; }
    public async removeTeamMember(userId: string): Promise<any> { const response = await this.axiosInstance.delete(`/users/team/${userId}`); return response.data; }
    public async acceptInvite(token: string, password: string): Promise<any> { const response = await this.axiosInstance.post('/auth/accept-invite', { token, new_password: password }); return response.data; }
    
    // --- MESSAGING ---
    public async sendClientMessage(caseId: string, data: { firstName: string, lastName: string, email: string, phone: string, message: string }) { const payload = { first_name: data.firstName, last_name: data.lastName, email: data.email, phone: data.phone, message: data.message }; const response = await this.axiosInstance.post(`/share/portal/${caseId}/message`, payload); return response.data; }
    public async getInboundMessages(status: 'INBOX' | 'ARCHIVED' | 'TRASHED'): Promise<any[]> { const response = await this.axiosInstance.get(`/share/messages`, { params: { status } }); return response.data; }
    public async updateMessageStatus(messageId: string, status: 'INBOX' | 'ARCHIVED' | 'TRASHED'): Promise<void> { await this.axiosInstance.put(`/share/messages/${messageId}/status`, { status }); }
    public async deleteMessage(messageId: string): Promise<void> { await this.axiosInstance.delete(`/share/messages/${messageId}`); }

    // --- ADMIN ---
    public async getAllUsers(): Promise<User[]> { const response = await this.axiosInstance.get<any>('/admin/users'); return Array.isArray(response.data) ? response.data : (response.data?.users || []); }
    public async updateUser(userId: string, data: UpdateUserRequest): Promise<User> { const response = await this.axiosInstance.put<User>(`/admin/users/${userId}`, data); return response.data; }
    public async deleteUser(userId: string): Promise<void> { await this.axiosInstance.delete(`/admin/users/${userId}`); }

    // --- MOBILE HANDOFF ---
    public async createHandoffSession(): Promise<{ token: string }> {
        const response = await this.axiosInstance.post<{ token: string }>('/mobile-handoff/create');
        return response.data;
    }
    public async uploadMobileFile(token: string, file: File): Promise<{ message: string }> {
        const formData = new FormData();
        formData.append('file', file);
        const response = await this.axiosInstance.post(`/mobile-handoff/upload/${token}`, formData);
        return response.data;
    }
    public async getHandoffStatus(token: string): Promise<{ status: 'pending' | 'complete', filename?: string }> {
        const response = await this.axiosInstance.get(`/mobile-handoff/status/${token}`);
        return response.data;
    }
    public async retrieveHandoffFile(token: string, filename: string): Promise<File> {
        const response = await this.axiosInstance.get(`/mobile-handoff/retrieve/${token}`, { responseType: 'blob' });
        return new File([response.data], filename, { type: response.headers['content-type'] });
    }

    // --- CASES ---
    public async getCases(): Promise<Case[]> { const response = await this.axiosInstance.get<any>('/cases'); return Array.isArray(response.data) ? response.data : (response.data?.cases || []); }
    public async createCase(data: CreateCaseRequest): Promise<Case> { const response = await this.axiosInstance.post<Case>('/cases', data); return response.data; }
    public async getCaseDetails(caseId: string): Promise<Case> { const response = await this.axiosInstance.get<Case>(`/cases/${caseId}`); return response.data; }
    public async deleteCase(caseId: string): Promise<void> { await this.axiosInstance.delete(`/cases/${caseId}`); }

    // --- DOCUMENTS ---
    public async getDocuments(caseId: string): Promise<Document[]> { const response = await this.axiosInstance.get<any>(`/cases/${caseId}/documents`); return Array.isArray(response.data) ? response.data : (response.data?.documents || []); }
    public async uploadDocument(caseId: string, file: File, onProgress?: (percent: number) => void): Promise<Document> { const formData = new FormData(); formData.append('file', file); const response = await this.axiosInstance.post<Document>(`/cases/${caseId}/documents/upload`, formData, { onUploadProgress: (progressEvent) => { if (onProgress && progressEvent.total) { const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total); onProgress(percent); } } }); return response.data; }
    public async getDocument(caseId: string, documentId: string): Promise<Document> { const response = await this.axiosInstance.get<Document>(`/cases/${caseId}/documents/${documentId}`); return response.data; }
    public async deleteDocument(caseId: string, documentId: string): Promise<DeletedDocumentResponse> { const response = await this.axiosInstance.delete<DeletedDocumentResponse>(`/cases/${caseId}/documents/${documentId}`); return response.data; }
    public async bulkDeleteDocuments(caseId: string, documentIds: string[]): Promise<any> { const response = await this.axiosInstance.post(`/cases/${caseId}/documents/bulk-delete`, { document_ids: documentIds }); return response.data; }
    public async getDocumentContent(caseId: string, documentId: string): Promise<DocumentContentResponse> { const response = await this.axiosInstance.get<DocumentContentResponse>(`/cases/${caseId}/documents/${documentId}/content`); return response.data; }
    public async getOriginalDocument(caseId: string, documentId: string): Promise<Blob> { const response = await this.axiosInstance.get(`/cases/${caseId}/documents/${documentId}/original`, { responseType: 'blob' }); return response.data; }
    public async downloadDocumentReport(caseId: string, documentId: string): Promise<Blob> { const response = await this.axiosInstance.get(`/cases/${caseId}/documents/${documentId}/report`, { responseType: 'blob' }); return response.data; }
    public async renameDocument(caseId: string, docId: string, newName: string): Promise<void> { await this.axiosInstance.put(`/cases/${caseId}/documents/${docId}/rename`, { new_name: newName }); }
    public async archiveCaseDocument(caseId: string, documentId: string): Promise<ArchiveItemOut> { const response = await this.axiosInstance.post<ArchiveItemOut>(`/cases/${caseId}/documents/${documentId}/archive`); return response.data; }

    // --- CHAT ---
    public async sendChatMessage(caseId: string, message: string, documentId?: string, jurisdiction?: string, agentType: string = 'business'): Promise<string> { const response = await this.axiosInstance.post<{ response: string }>(`/chat/case/${caseId}`, { message, document_id: documentId || null, jurisdiction: jurisdiction || 'ks', agent_type: agentType }); return response.data.response; }
    public async clearChatHistory(caseId: string): Promise<void> { await this.axiosInstance.delete(`/chat/case/${caseId}/history`); }

    // --- AI / INTELLIGENCE ---
    public async analyzeTaxAnomalies(month: number, year: number): Promise<TaxAuditResult> { try { const response = await this.axiosInstance.post<TaxAuditResult>('/analysis/tax/audit', { month, year }); return response.data; } catch (e) { return { anomalies: ["Sistemi nuk mund të kryejë analizën për momentin."], status: 'WARNING', net_obligation: 0 }; } }
    public async chatWithTaxBot(message: string): Promise<string> { try { const response = await this.axiosInstance.post<{ response: string }>('/analysis/tax/chat', { message }); return response.data.response; } catch (e) { return "Më falni, shërbimi i asistencës tatimore është përkohësisht jashtë funksionit."; } }
    
    // PHOENIX: FORENSIC ACCOUNTANT
    public async chatWithAccountant(query: string): Promise<ReadableStreamDefaultReader<Uint8Array>> {
        const token = tokenManager.get();
        if (!token) await this.refreshToken();
        
        const response = await fetch(`${API_V1_URL}/accountant/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenManager.get()}`
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok || !response.body) {
            throw new Error("Failed to connect to Accountant Agent.");
        }

        return response.body.getReader();
    }
    
    // PHOENIX: OLD DOWNLOAD (Deprecated or kept for other uses)
    public async downloadAuditReport(content: string): Promise<Blob> {
        const response = await this.axiosInstance.post('/accountant/export-audit', { content }, { responseType: 'blob' });
        return response.data;
    }

    // PHOENIX: NEW SAVE TO ARCHIVE
    public async saveAuditReportToArchive(content: string): Promise<{ message: string, document_id: string }> {
        const response = await this.axiosInstance.post('/accountant/save-report', { content });
        return response.data;
    }

    public async askDocumentQuestion(documentId: string, question: string): Promise<{ answer: string }> { const response = await this.axiosInstance.post<{ answer: string }>(`/archive/items/${documentId}/chat`, { question }); return response.data; }
    public async predictRestock(itemId: string): Promise<RestockPrediction> { try { const response = await this.axiosInstance.post<RestockPrediction>('/analysis/inventory/predict', { item_id: itemId }); return response.data; } catch (e) { return { suggested_quantity: 0, reason: "Analiza e padisponueshme për momentin.", estimated_cost: 0 }; } }
    public async analyzeSalesTrend(itemId: string): Promise<SalesTrendAnalysis> { try { const response = await this.axiosInstance.post<SalesTrendAnalysis>('/analysis/inventory/trend', { item_id: itemId }); return response.data; } catch (e) { return { trend_analysis: "E padisponueshme", cross_sell_opportunities: "E padisponueshme" }; } }
    public async getKpiInsight(kpiType: string): Promise<KpiInsightResponse> { try { const response = await this.axiosInstance.post<KpiInsightResponse>('/analysis/finance/kpi-insight', { kpi_type: kpiType }); return response.data; } catch (e) { return { summary: "Shërbimi i analizës është offline.", key_contributors: [] }; } }
    public async getProactiveInsight(): Promise<GeneralInsightResponse> { try { const response = await this.axiosInstance.get<GeneralInsightResponse>('/analysis/finance/proactive-insight'); return response.data; } catch (e) { return { insight: "Shtoni transaksione për të parë analizat e AI.", sentiment: "neutral" }; } }
    
    public async analyzeDocument(file: File): Promise<AnalysisResult> {
        const formData = new FormData();
        formData.append('file', file);
            
        const response = await this.axiosInstance.post<AnalysisResult>(`/analysis/analyze-spreadsheet`, formData);
        return response.data;
    }

    // --- FINANCE & ANALYTICS ---
    public async getAnalyticsDashboard(days: number = 30): Promise<AnalyticsDashboardData> { const response = await this.axiosInstance.get<AnalyticsDashboardData>(`/finance/analytics/dashboard`, { params: { days } }); return response.data; }
    public async getCaseSummaries(): Promise<CaseFinancialSummary[]> { const response = await this.axiosInstance.get<CaseFinancialSummary[]>('/finance/case-summary'); return response.data; }
    public async getInvoices(): Promise<Invoice[]> { const response = await this.axiosInstance.get<any>('/finance/invoices'); return Array.isArray(response.data) ? response.data : (response.data?.invoices || []); }
    public async createInvoice(data: InvoiceCreateRequest): Promise<Invoice> { const response = await this.axiosInstance.post<Invoice>('/finance/invoices', data); return response.data; }
    public async updateInvoice(invoiceId: string, data: InvoiceUpdate): Promise<Invoice> { const response = await this.axiosInstance.put<Invoice>(`/finance/invoices/${invoiceId}`, data); return response.data; }
    public async deleteInvoice(invoiceId: string): Promise<void> { await this.axiosInstance.delete(`/finance/invoices/${invoiceId}`); }
    public async getInvoicePdfBlob(invoiceId: string, lang: string = 'sq'): Promise<Blob> { const response = await this.axiosInstance.get(`/finance/invoices/${invoiceId}/pdf`, { params: { lang }, responseType: 'blob' }); return response.data; }
    public async downloadInvoicePdf(invoiceId: string, lang: string = 'sq'): Promise<void> { const blob = await this.getInvoicePdfBlob(invoiceId, lang); const url = window.URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Invoice_${invoiceId}.pdf`); document.body.appendChild(link); link.click(); link.parentNode?.removeChild(link); window.URL.revokeObjectURL(url); }
    public async archiveInvoice(invoiceId: string, caseId?: string): Promise<ArchiveItemOut> { const params = caseId ? { case_id: caseId } : {}; const response = await this.axiosInstance.post<ArchiveItemOut>(`/finance/invoices/${invoiceId}/archive`, null, { params }); return response.data; }
    public async getExpenses(): Promise<Expense[]> { const response = await this.axiosInstance.get<any>('/finance/expenses'); return Array.isArray(response.data) ? response.data : (response.data?.expenses || []); }
    public async createExpense(data: ExpenseCreateRequest): Promise<Expense> { const response = await this.axiosInstance.post<Expense>('/finance/expenses', data); return response.data; }
    public async updateExpense(expenseId: string, data: ExpenseUpdate): Promise<Expense> { const response = await this.axiosInstance.put<Expense>(`/finance/expenses/${expenseId}`, data); return response.data; }
    public async deleteExpense(expenseId: string): Promise<void> { await this.axiosInstance.delete(`/finance/expenses/${expenseId}`); }
    public async uploadExpenseReceipt(expenseId: string, file: File): Promise<void> { const formData = new FormData(); formData.append('file', file); await this.axiosInstance.put(`/finance/expenses/${expenseId}/receipt`, formData); }
    public async getExpenseReceiptBlob(expenseId: string): Promise<{ blob: Blob, filename: string }> { const response = await this.axiosInstance.get(`/finance/expenses/${expenseId}/receipt`, { responseType: 'blob' }); const disposition = response.headers['content-disposition']; let filename = `receipt-${expenseId}.pdf`; if (disposition && disposition.indexOf('filename=') !== -1) { const matches = /filename="([^"]*)"/.exec(disposition); if (matches != null && matches[1]) filename = matches[1]; } return { blob: response.data, filename }; }
    public async getPosTransactions(): Promise<PosTransaction[]> { const response = await this.axiosInstance.get<any>('/finance/import/transactions'); if (Array.isArray(response.data)) { return response.data; } if (response.data && Array.isArray(response.data.transactions)) { return response.data.transactions; } return []; }
    public async deletePosTransaction(transactionId: string): Promise<void> { await this.axiosInstance.delete(`/finance/transactions/${transactionId}`); }
    public async bulkDeleteTransactions(ids: { invoice_ids?: string[], expense_ids?: string[], pos_ids?: string[] }): Promise<any> { const response = await this.axiosInstance.post('/finance/transactions/bulk-delete', ids); return response.data; }
    public async getWizardState(month: number, year: number): Promise<WizardState> { const response = await this.axiosInstance.get<WizardState>('/finance/wizard/state', { params: { month, year } }); return response.data; }
    public async downloadMonthlyReport(month: number, year: number): Promise<void> { const response = await this.axiosInstance.get('/finance/wizard/report/pdf', { params: { month, year }, responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([response.data])); const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Raporti_${month}_${year}.pdf`); document.body.appendChild(link); link.click(); link.parentNode?.removeChild(link); window.URL.revokeObjectURL(url); }
    public async previewImport(file: File): Promise<ImportPreviewResponse> { const formData = new FormData(); formData.append('file', file); const response = await this.axiosInstance.post<ImportPreviewResponse>('/finance/import/preview', formData); return response.data; }
    public async confirmImport(file: File, mapping: Record<string, string>, importType: 'pos' | 'bank'): Promise<ImportResult> { const formData = new FormData(); formData.append('file', file); formData.append('mapping', JSON.stringify(mapping)); formData.append('importType', importType); const response = await this.axiosInstance.post<ImportResult>('/finance/import/confirm', formData); return response.data; }

    // --- INVENTORY ---
    public async getInventoryItems(): Promise<InventoryItem[]> { const response = await this.axiosInstance.get<InventoryItem[]>('/inventory/items'); return response.data; }
    public async createInventoryItem(data: InventoryItemCreate): Promise<InventoryItem> { const response = await this.axiosInstance.post<InventoryItem>('/inventory/items', data); return response.data; }
    public async updateInventoryItem(id: string, data: InventoryItemCreate): Promise<InventoryItem> { const response = await this.axiosInstance.put<InventoryItem>(`/inventory/items/${id}`, data); return response.data; }
    public async deleteInventoryItem(id: string): Promise<void> { await this.axiosInstance.delete(`/inventory/items/${id}`); }
    public async importInventoryItems(file: File): Promise<InventoryImportResult> { const formData = new FormData(); formData.append('file', file); const response = await this.axiosInstance.post<InventoryImportResult>('/inventory/items/import', formData); return response.data; }
    public async getRecipes(): Promise<Recipe[]> { const response = await this.axiosInstance.get<Recipe[]>('/inventory/recipes'); return response.data; }
    public async createRecipe(data: RecipeCreate): Promise<Recipe> { const response = await this.axiosInstance.post<Recipe>('/inventory/recipes', data); return response.data; }
    public async updateRecipe(id: string, data: RecipeCreate): Promise<Recipe> { const response = await this.axiosInstance.put<Recipe>(`/inventory/recipes/${id}`, data); return response.data; }
    public async deleteRecipe(id: string): Promise<void> { await this.axiosInstance.delete(`/inventory/recipes/${id}`); }
    public async importRecipes(file: File): Promise<RecipeImportResult> { const formData = new FormData(); formData.append('file', file); const response = await this.axiosInstance.post<RecipeImportResult>('/inventory/recipes/import', formData); return response.data; }

    // --- ARCHIVE ---
    public async getArchiveItems(category?: string, caseId?: string, parentId?: string): Promise<ArchiveItemOut[]> { const params: any = {}; if (category) params.category = category; if (caseId) params.case_id = caseId; if (parentId) params.parent_id = parentId; const response = await this.axiosInstance.get<{items: ArchiveItemOut[]}>('/archive/items', { params }); return Array.isArray(response.data) ? response.data : (response.data?.items || []); }
    public async createArchiveFolder(title: string, parentId?: string, caseId?: string, category?: string): Promise<ArchiveItemOut> { const formData = new FormData(); formData.append('title', title); if (parentId) formData.append('parent_id', parentId); if (caseId) formData.append('case_id', caseId); if (category) formData.append('category', category); const response = await this.axiosInstance.post<ArchiveItemOut>('/archive/folder', formData); return response.data; }
    public async uploadArchiveItem(file: File, title: string, category: string, caseId?: string, parentId?: string): Promise<ArchiveItemOut> { const formData = new FormData(); formData.append('file', file); formData.append('title', title); formData.append('category', category); if (caseId) formData.append('case_id', caseId); if (parentId) formData.append('parent_id', parentId); const response = await this.axiosInstance.post<ArchiveItemOut>('/archive/upload', formData); return response.data; }
    public async deleteArchiveItem(itemId: string): Promise<void> { await this.axiosInstance.delete(`/archive/items/${itemId}`); }
    public async renameArchiveItem(itemId: string, newTitle: string): Promise<void> { await this.axiosInstance.put(`/archive/items/${itemId}/rename`, { new_title: newTitle }); }
    
    // PHOENIX: RESTORED METHOD
    public async getArchiveFileBlob(itemId: string): Promise<Blob> {
        const response = await this.axiosInstance.get(`/archive/items/${itemId}/download`, { params: { preview: true }, responseType: 'blob' });
        return response.data;
    }

    public async downloadArchiveItem(itemId: string, title: string): Promise<void> { const blob = await this.getArchiveFileBlob(itemId); const url = window.URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.setAttribute('download', title); document.body.appendChild(link); link.click(); link.parentNode?.removeChild(link); window.URL.revokeObjectURL(url); }
    public async shareArchiveItem(itemId: string, isShared: boolean, caseId?: string): Promise<ArchiveItemOut> { const response = await this.axiosInstance.put<ArchiveItemOut>(`/archive/items/${itemId}/share`, { is_shared: isShared, case_id: caseId }); return response.data; }
    public async reIndexArchiveItem(itemId: string): Promise<void> { await this.axiosInstance.post(`/archive/items/${itemId}/re-index`); }
    public async importArchiveDocuments(caseId: string, documentIds: string[]): Promise<Document[]> { const response = await this.axiosInstance.post<Document[]>(`/cases/${caseId}/documents/import-archive`, { archive_item_ids: documentIds }); return response.data; }

    // --- CALENDAR ---
    public async getCalendarEvents(): Promise<CalendarEvent[]> { const response = await this.axiosInstance.get<any>('/calendar/events'); return Array.isArray(response.data) ? response.data : (response.data?.events || []); }
    public async createCalendarEvent(data: CalendarEventCreateRequest): Promise<CalendarEvent> { const response = await this.axiosInstance.post<CalendarEvent>('/calendar/events', data); return response.data; }
    public async deleteCalendarEvent(eventId: string): Promise<void> { await this.axiosInstance.delete(`/calendar/events/${eventId}`); }
    public async getAlertsCount(): Promise<{ count: number }> { const response = await this.axiosInstance.get<{ count: number }>('/calendar/alerts'); return response.data; }

    // --- DRAFTING V2 (ASYNC) ---
    public async initiateDraftingJob(data: CreateDraftingJobRequest): Promise<DraftingJobStatus> { const response = await this.axiosInstance.post<DraftingJobStatus>(`${API_V2_URL}/drafting/jobs`, data); return response.data; }
    public async getDraftingJobStatus(jobId: string): Promise<DraftingJobStatus> { const response = await this.axiosInstance.get<DraftingJobStatus>(`${API_V2_URL}/drafting/jobs/${jobId}/status`); return response.data; }
    public async getDraftingJobResult(jobId: string): Promise<DraftingJobResult> { const response = await this.axiosInstance.get<DraftingJobResult>(`${API_V2_URL}/drafting/jobs/${jobId}/result`); return response.data; }
    
    // --- DRAFTING (SYNC) ---
    public async createPurchaseOrder(data: { item_id: string; item_name: string; unit: string; quantity: number; estimated_cost: number; supplier_name: string; }): Promise<any> { const response = await this.axiosInstance.post('/drafting/purchase-order', data); return response.data; }

    // --- BUSINESS ---
    public async getBusinessProfile(): Promise<BusinessProfile> { const response = await this.axiosInstance.get<BusinessProfile>('/business/profile'); return response.data; }
    public async updateBusinessProfile(data: BusinessProfileUpdate): Promise<BusinessProfile> { const response = await this.axiosInstance.put<BusinessProfile>('/business/profile', data); return response.data; }
    public async uploadBusinessLogo(file: File): Promise<BusinessProfile> { const formData = new FormData(); formData.append('file', file); const response = await this.axiosInstance.put<BusinessProfile>('/business/logo', formData); return response.data; }
    public async fetchImageBlob(url: string): Promise<Blob> { const response = await this.axiosInstance.get(url, { responseType: 'blob' }); return response.data; }

    // --- BRIEFING & SUPPORT ---
    public async getStrategicBriefing(): Promise<StrategicBriefingResponse> { const response = await this.axiosInstance.get<StrategicBriefingResponse>('/briefing/strategic'); return response.data; }
    public async sendContactForm(data: { firstName: string; lastName: string; email: string; phone: string; message: string }): Promise<void> { await this.axiosInstance.post('/support/contact', { first_name: data.firstName, last_name: data.lastName, email: data.email, phone: data.phone, message: data.message }); }
    
    // --- INTERCONNECTED INTELLIGENCE (UPGRADED) ---
    public async getGraphData(mode: string = 'global'): Promise<GraphData> {
        try {
            const response = await this.axiosInstance.get<GraphData>('/graph/visualize', {
                params: { mode }
            });
            return response.data || { nodes: [], links: [] };
        } catch (error) {
            console.error("Failed to fetch graph data:", error);
            return { nodes: [], links: [] };
        }
    }
}

export const apiService = new ApiService();