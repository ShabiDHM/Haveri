// FILE: src/components/business/FinanceTab.tsx
// PHOENIX PROTOCOL - FINANCE TAB V13.8 (FULL-STACK VALIDATED)
// 1. REFACTOR: Removed "History" tab and its obsolete project-based grouping logic.
// 2. CONSOLIDATION: "Transactions" tab is now the single source of truth, displaying Invoices, Expenses, and POS transactions.
// 3. FULL-STACK VERIFICATION: Confirmed backend still requires Case/Project data for the "Archive" feature; this logic has been preserved to prevent system degradation.
// 4. STATUS: Component is now fully synchronized with the backend's single-source financial model while maintaining archival functionality.

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
    TrendingUp, TrendingDown, Calculator, MinusCircle, Plus, FileText, 
    Edit2, Eye, Download, Archive, Trash2, CheckCircle, Paperclip, X, User, Activity, 
    Loader2, BarChart2, Search,
    Car, Coffee, Building, Users, Landmark, Zap, Wifi, Utensils,
    FileSpreadsheet, PiggyBank, ShoppingCart, ArrowUpRight, ArrowDownRight, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { 
    Invoice, InvoiceItem, Case, Document, 
    Expense, ExpenseCreateRequest, AnalyticsDashboardData, PosTransaction
} from '../../data/types';
import { useTranslation } from 'react-i18next';
import PDFViewerModal from '../PDFViewerModal';
import { TransactionImporter } from './TransactionImporter'; 
import * as ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { sq, enUS } from 'date-fns/locale';
import { 
    BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const DatePicker = (ReactDatePicker as any).default;

// --- MODERN UI COMPONENTS ---

const HeroStatCard = ({ title, amount, icon, trend, type }: { title: string, amount: string, icon: React.ReactNode, trend?: string, type: 'income' | 'expense' | 'neutral' | 'warning' }) => {
    let colorClass = 'text-blue-400';
    let bgClass = 'bg-blue-500/10';
    let shadowClass = 'shadow-blue-500/20';

    if (type === 'income') { colorClass = 'text-emerald-400'; bgClass = 'bg-emerald-500/10'; shadowClass = 'shadow-emerald-500/20'; }
    if (type === 'expense') { colorClass = 'text-rose-400'; bgClass = 'bg-rose-500/10'; shadowClass = 'shadow-rose-500/20'; }
    if (type === 'warning') { colorClass = 'text-amber-400'; bgClass = 'bg-amber-500/10'; shadowClass = 'shadow-amber-500/20'; }

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-md hover:bg-white/10 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-3">
                <div className={`p-2.5 rounded-xl ${bgClass} ${colorClass} shadow-lg ${shadowClass}`}>
                    {icon}
                </div>
                {trend && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/5 text-gray-400 border border-white/10">
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-white tracking-tight">{amount}</h3>
            </div>
        </div>
    );
};

const ActionButton = ({ icon, label, onClick, primary = false }: { icon: React.ReactNode, label: string, onClick: () => void, primary?: boolean }) => (
    <button 
        onClick={onClick} 
        className={`
            flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
            ${primary 
                ? 'bg-primary-start hover:bg-primary-end text-white shadow-lg shadow-primary-start/20' 
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 hover:border-white/20'
            }
        `}
    >
        {icon}
        <span>{label}</span>
    </button>
);

const TabButton = ({ label, icon, isActive, onClick }: { label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void }) => (
    <button 
        onClick={onClick} 
        className={`
            relative px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-2
            ${isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}
        `}
    >
        {isActive && (
            <motion.div layoutId="activeTab" className="absolute inset-0 bg-white/10 rounded-xl" initial={false} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
        )}
        <span className="relative z-10">{icon}</span>
        <span className="relative z-10">{label}</span>
    </button>
);

export const FinanceTab: React.FC = () => {
    type ActiveTab = 'transactions' | 'reports';

    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const localeMap: { [key: string]: any } = { sq, al: sq, en: enUS };
    const currentLocale = localeMap[i18n.language] || enUS;

    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [posTransactions, setPosTransactions] = useState<PosTransaction[]>([]);
    const [cases, setCases] = useState<Case[]>([]);
    const [activeTab, setActiveTab] = useState<ActiveTab>('transactions');
    const [openingDocId, setOpeningDocId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [analyticsData, setAnalyticsData] = useState<AnalyticsDashboardData | null>(null);
    
    // Modals State
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false); 
    const [showArchiveInvoiceModal, setShowArchiveInvoiceModal] = useState(false);
    const [showArchiveExpenseModal, setShowArchiveExpenseModal] = useState(false);
    
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
    const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
    const [selectedCaseForInvoice, setSelectedCaseForInvoice] = useState<string>("");
    const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
    const [viewingUrl, setViewingUrl] = useState<string | null>(null);

    const [newInvoice, setNewInvoice] = useState({ 
        client_name: '', client_email: '', client_phone: '', client_address: '', 
        client_city: '', client_tax_id: '', client_website: '', 
        tax_rate: 18, notes: '', status: 'PAID'
    });
    const [includeVat, setIncludeVat] = useState(true);

    const [lineItems, setLineItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
    const [newExpense, setNewExpense] = useState<Omit<ExpenseCreateRequest, 'related_case_id'>>({ category: '', amount: 0, description: '', date: new Date().toISOString().split('T')[0] });
    const [expenseDate, setExpenseDate] = useState<Date | null>(new Date());
    const [expenseReceipt, setExpenseReceipt] = useState<File | null>(null);
    const receiptInputRef = useRef<HTMLInputElement>(null);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [inv, exp, cs, analytics, pos] = await Promise.all([
                apiService.getInvoices().catch(() => []),
                apiService.getExpenses().catch(() => []),
                apiService.getCases().catch(() => []),
                apiService.getAnalyticsDashboard(30).catch(() => null),
                apiService.getPosTransactions().catch(() => []),
            ]);
            setInvoices(inv); setExpenses(exp); setCases(cs); setAnalyticsData(analytics); setPosTransactions(pos);
        } catch (e) { console.error("Critical error loading finance data", e); } finally { setLoading(false); }
    };

    useEffect(() => { loadInitialData(); }, []);

    // Totals
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const displayIncome = analyticsData ? analyticsData.total_revenue_period : 0;
    const displayProfit = analyticsData?.total_profit_period ?? (displayIncome - totalExpenses);
    const costOfGoodsSold = analyticsData ? displayIncome - displayProfit : 0;

    const sortedTransactions = useMemo(() => {
        const combined = [
            ...invoices.map(i => ({ ...i, type: 'invoice' as const, date: i.issue_date, amount: i.total_amount, label: i.client_name })),
            ...expenses.map(e => ({ ...e, type: 'expense' as const, amount: e.amount, label: e.category })),
            ...posTransactions.map(p => ({ 
                ...p, 
                type: 'pos' as const, 
                date: p.transaction_date || (p as any).date || new Date().toISOString(), 
                amount: p.total_price ?? (p as any).amount ?? 0, 
                label: p.product_name || (p as any).description || t('finance.posSale') 
            })),
        ];
        return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [invoices, expenses, posTransactions, t]);

    const filteredTransactions = useMemo(() => {
        if (!searchTerm) return sortedTransactions;
        const lowerTerm = searchTerm.toLowerCase();
        return sortedTransactions.filter(tx => {
            if (tx.type === 'invoice') return (tx.label.toLowerCase().includes(lowerTerm) || (tx as Invoice).invoice_number?.toLowerCase().includes(lowerTerm) || tx.amount.toString().includes(lowerTerm));
            if (tx.type === 'expense') return (tx.label.toLowerCase().includes(lowerTerm) || (tx as Expense).description?.toLowerCase().includes(lowerTerm) || tx.amount.toString().includes(lowerTerm));
            if (tx.type === 'pos') return (tx.label.toLowerCase().includes(lowerTerm) || tx.amount.toString().includes(lowerTerm));
            return false;
        });
    }, [sortedTransactions, searchTerm]);

    const getCategoryIcon = (category: string) => { 
        const cat = category.toLowerCase(); 
        if (cat.includes('transport') || cat.includes('naft') || cat.includes('vetur')) return <Car size={20} />; 
        if (cat.includes('ushqim') || cat.includes('drek')) return <Utensils size={20} />; 
        if (cat.includes('kafe')) return <Coffee size={20} />; 
        if (cat.includes('zyr') || cat.includes('rent')) return <Building size={20} />; 
        if (cat.includes('pag') || cat.includes('rrog')) return <Users size={20} />; 
        if (cat.includes('tatim')) return <Landmark size={20} />; 
        if (cat.includes('rrym')) return <Zap size={20} />; 
        if (cat.includes('internet')) return <Wifi size={20} />; 
        return <ArrowUpRight size={20} />; 
    };
    
    const closePreview = () => { if (viewingUrl) window.URL.revokeObjectURL(viewingUrl); setViewingUrl(null); setViewingDoc(null); };
    const addLineItem = () => setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
    const removeLineItem = (i: number) => lineItems.length > 1 && setLineItems(lineItems.filter((_, idx) => idx !== i));
    const updateLineItem = (i: number, f: keyof InvoiceItem, v: any) => { const n = [...lineItems]; n[i] = { ...n[i], [f]: v }; n[i].total = n[i].quantity * n[i].unit_price; setLineItems(n); };
    
    const handleEditInvoice = (invoice: Invoice) => { setEditingInvoiceId(invoice.id); setNewInvoice({ client_name: invoice.client_name, client_email: invoice.client_email || '', client_address: invoice.client_address || '', client_phone: (invoice as any).client_phone || '', client_city: (invoice as any).client_city || '', client_tax_id: (invoice as any).client_tax_id || '', client_website: (invoice as any).client_website || '', tax_rate: invoice.tax_rate, notes: invoice.notes || '', status: invoice.status }); setIncludeVat(invoice.tax_rate > 0); setLineItems(invoice.items); setShowInvoiceModal(true); };
    const handleCreateOrUpdateInvoice = async (e: React.FormEvent) => { e.preventDefault(); try { const payload = { ...newInvoice, items: lineItems, tax_rate: includeVat ? newInvoice.tax_rate : 0 }; if (editingInvoiceId) { const u = await apiService.updateInvoice(editingInvoiceId, payload); setInvoices(invoices.map(i => i.id === editingInvoiceId ? u : i)); } else { const n = await apiService.createInvoice(payload); setInvoices([n, ...invoices]); } closeInvoiceModal(); } catch { alert(t('error.generic')); } };
    const closeInvoiceModal = () => { setShowInvoiceModal(false); setEditingInvoiceId(null); setNewInvoice({ client_name: '', client_email: '', client_phone: '', client_address: '', client_city: '', client_tax_id: '', client_website: '', tax_rate: 18, notes: '', status: 'PAID' }); setIncludeVat(true); setLineItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }]); };
    const deleteInvoice = async (id: string) => { if(!window.confirm(t('general.confirmDelete'))) return; try { await apiService.deleteInvoice(id); setInvoices(invoices.filter(inv => inv.id !== id)); } catch { alert(t('documentsPanel.deleteFailed')); } };
    const handleViewInvoice = async (invoice: Invoice) => { setOpeningDocId(invoice.id); try { const blob = await apiService.getInvoicePdfBlob(invoice.id, i18n.language || 'sq'); const url = window.URL.createObjectURL(blob); setViewingUrl(url); setViewingDoc({ id: invoice.id, file_name: `${t('finance.invoicePrefix')}${invoice.invoice_number}`, mime_type: 'application/pdf', status: 'READY' } as any); } catch { alert(t('error.generic')); } finally { setOpeningDocId(null); } };
    const downloadInvoice = async (id: string) => { try { await apiService.downloadInvoicePdf(id, i18n.language || 'sq'); } catch { alert(t('error.generic')); } };
    const handleArchiveInvoiceClick = (id: string) => { setSelectedInvoiceId(id); setShowArchiveInvoiceModal(true); };
    const submitArchiveInvoice = async () => { if (!selectedInvoiceId) return; try { await apiService.archiveInvoice(selectedInvoiceId, selectedCaseForInvoice || undefined); alert(t('general.saveSuccess')); setShowArchiveInvoiceModal(false); setSelectedCaseForInvoice(""); } catch { alert(t('error.generic')); } };
    const handleEditExpense = (expense: Expense) => { setEditingExpenseId(expense.id); setNewExpense({ category: expense.category, amount: expense.amount, description: expense.description || '', date: expense.date }); setExpenseDate(new Date(expense.date)); setShowExpenseModal(true); };
    const handleCreateOrUpdateExpense = async (e: React.FormEvent) => { e.preventDefault(); try { const payload = { ...newExpense, date: expenseDate ? expenseDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0] }; let s: Expense; if (editingExpenseId) { s = await apiService.updateExpense(editingExpenseId, payload); setExpenses(expenses.map(exp => exp.id === editingExpenseId ? s : exp)); } else { s = await apiService.createExpense(payload); setExpenses([s, ...expenses]); } if (expenseReceipt && s.id) { await apiService.uploadExpenseReceipt(s.id, expenseReceipt); const f = { ...s, receipt_url: "PENDING_REFRESH" }; setExpenses(prev => prev.map(exp => exp.id === f.id ? f : exp)); } closeExpenseModal(); } catch { alert(t('error.generic')); } };
    const closeExpenseModal = () => { setShowExpenseModal(false); setEditingExpenseId(null); setNewExpense({ category: '', amount: 0, description: '', date: new Date().toISOString().split('T')[0] }); setExpenseReceipt(null); };
    const deleteExpense = async (id: string) => { if(!window.confirm(t('general.confirmDelete'))) return; try { await apiService.deleteExpense(id); setExpenses(expenses.filter(e => e.id !== id)); } catch { alert(t('error.generic')); } };
    
    const generateDigitalReceipt = (expense: Expense): File => {
        const content = `${t('finance.digitalReceipt.title')}\n------------------------------------------------\n` +
                        `${t('finance.digitalReceipt.category')}   ${expense.category}\n` +
                        `${t('finance.digitalReceipt.amount')}       €${expense.amount.toFixed(2)}\n` +
                        `${t('finance.digitalReceipt.date')}        ${new Date(expense.date).toLocaleDateString('sq-AL')}\n` +
                        `${t('finance.digitalReceipt.description')}  ${expense.description || t('finance.digitalReceipt.noDescription')}\n` +
                        `------------------------------------------------\n` +
                        `${t('finance.digitalReceipt.generated')}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const fileName = `${t('finance.digitalReceipt.fileNamePrefix')}_${expense.category.replace(/\s+/g, '_')}_${expense.date}.txt`;
        return new File([blob], fileName, { type: 'text/plain' });
    };

    const handleViewExpense = async (expense: Expense) => { setOpeningDocId(expense.id); try { let url: string, file_name: string, mime_type: string; if (expense.receipt_url) { const { blob, filename } = await apiService.getExpenseReceiptBlob(expense.id); url = window.URL.createObjectURL(blob); file_name = filename; const ext = filename.split('.').pop()?.toLowerCase(); mime_type = ext === 'pdf' ? 'application/pdf' : 'image/jpeg'; } else { const file = generateDigitalReceipt(expense); url = window.URL.createObjectURL(file); file_name = file.name; mime_type = 'text/plain'; } setViewingUrl(url); setViewingDoc({ id: expense.id, file_name, mime_type, status: 'READY' } as any); } catch { alert(t('error.receiptNotFound')); } finally { setOpeningDocId(null); } };
    const handleDownloadExpense = async (expense: Expense) => { try { let url: string, filename: string; if (expense.receipt_url) { const { blob, filename: fn } = await apiService.getExpenseReceiptBlob(expense.id); url = window.URL.createObjectURL(blob); filename = fn; } else { const file = generateDigitalReceipt(expense); url = window.URL.createObjectURL(file); filename = file.name; } const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); if (!expense.receipt_url) window.URL.revokeObjectURL(url); } catch { alert(t('error.generic')); } };
    const handleArchiveExpenseClick = (id: string) => { setSelectedExpenseId(id); setShowArchiveExpenseModal(true); };
    const submitArchiveExpense = async () => { if (!selectedExpenseId) return; try { const ex = expenses.find(e => e.id === selectedExpenseId); if (!ex) return; let fileToUpload: File; if (ex.receipt_url) { const { blob, filename } = await apiService.getExpenseReceiptBlob(ex.id); fileToUpload = new File([blob], filename, { type: blob.type }); } else { fileToUpload = generateDigitalReceipt(ex); } await apiService.uploadArchiveItem(fileToUpload, fileToUpload.name, "EXPENSE", selectedCaseForInvoice || undefined, undefined); alert(t('general.saveSuccess')); setShowArchiveExpenseModal(false); setSelectedCaseForInvoice(""); } catch { alert(t('error.generic')); } };

    if (loading) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-10 h-10 animate-spin text-primary-start" /></div>;
    
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <style>{`.custom-finance-scroll::-webkit-scrollbar { width: 6px; } .custom-finance-scroll::-webkit-scrollbar-track { background: transparent; } .custom-finance-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; } .custom-finance-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }`}</style>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <HeroStatCard title={t('finance.income')} amount={`€${(displayIncome || 0).toFixed(2)}`} icon={<TrendingUp size={20} />} type="income" />
                <HeroStatCard title={t('finance.cogs')} amount={`€${(costOfGoodsSold || 0).toFixed(2)}`} icon={<Calculator size={20} />} type="warning" />
                <HeroStatCard title={t('finance.balanceSub')} amount={`€${(displayProfit || 0).toFixed(2)}`} icon={<PiggyBank size={20} />} type="neutral" trend="+12%"/>
                <HeroStatCard title={t('finance.expense')} amount={`€${(totalExpenses || 0).toFixed(2)}`} icon={<TrendingDown size={20} />} type="expense" />
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                <ActionButton primary icon={<Plus size={16} />} label={t('finance.createInvoice')} onClick={() => setShowInvoiceModal(true)} />
                <div className="w-px h-8 bg-white/10 mx-2 hidden sm:block"></div>
                <ActionButton icon={<FileSpreadsheet size={16} />} label={t('finance.import.title')} onClick={() => setShowImportModal(true)} />
                <ActionButton icon={<MinusCircle size={16} />} label={t('finance.addExpense')} onClick={() => setShowExpenseModal(true)} />
                <ActionButton icon={<Calculator size={16} />} label={t('finance.monthlyClose')} onClick={() => navigate('/finance/wizard')} />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md min-h-[600px] flex flex-col">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6 border-b border-white/5 pb-6">
                    <h2 className="text-2xl font-bold text-white tracking-tight">{t('finance.activityAndReports')}</h2>
                    <div className="flex items-center gap-1 bg-black/20 p-1.5 rounded-2xl">
                        <TabButton label={t('finance.tabTransactions')} icon={<Activity size={16} />} isActive={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} />
                        <TabButton label={t('finance.tabReports')} icon={<BarChart2 size={16} />} isActive={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    {activeTab === 'transactions' && (
                        <div className="flex flex-col h-full space-y-4">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                <input type="text" placeholder={t('header.searchPlaceholder')} className="w-full bg-black/20 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-start/50 transition-colors" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-finance-scroll pr-2 space-y-1">
                                {filteredTransactions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                        <ShoppingCart size={48} className="mb-4 opacity-20" />
                                        <p>{t('finance.noTransactions')}</p>
                                    </div>
                                ) : filteredTransactions.map((tx) => (
                                    <div key={`${tx.type}-${tx.id}`} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 cursor-default gap-3">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className={`p-3 rounded-xl ${tx.type === 'invoice' || tx.type === 'pos' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                {tx.type === 'invoice' ? <ArrowDownRight size={20} /> : tx.type === 'pos' ? <ShoppingCart size={20} /> : getCategoryIcon(tx.label)}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-semibold text-white truncate">{tx.label}</h4>
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <Calendar size={12} />
                                                    <span>{new Date(tx.date).toLocaleDateString()}</span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                                    <span className="uppercase text-[10px] tracking-wider bg-white/5 px-1.5 rounded">{tx.type}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                                            <span className={`text-lg font-bold font-mono ${tx.type === 'invoice' || tx.type === 'pos' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {tx.type === 'invoice' || tx.type === 'pos' ? '+' : '-'}€{(tx.amount || 0).toFixed(2)}
                                            </span>
                                            
                                            {tx.type !== 'pos' && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => tx.type === 'invoice' ? handleEditInvoice(tx as Invoice) : handleEditExpense(tx as Expense)} className="p-2 hover:bg-white/10 rounded-lg text-amber-400 hover:text-amber-300" title={t('general.edit')}><Edit2 size={16} /></button>
                                                    <button onClick={() => tx.type === 'invoice' ? handleViewInvoice(tx as Invoice) : handleViewExpense(tx as Expense)} disabled={openingDocId === tx.id} className="p-2 hover:bg-white/10 rounded-lg text-blue-400 hover:text-blue-300" title={t('general.view')}>
                                                        {openingDocId === tx.id ? <Loader2 size={16} className="animate-spin"/> : <Eye size={16} />}
                                                    </button>
                                                    <button onClick={() => tx.type === 'invoice' ? downloadInvoice(tx.id) : handleDownloadExpense(tx as Expense)} className="p-2 hover:bg-white/10 rounded-lg text-green-400 hover:text-green-300" title={t('general.download')}>
                                                        <Download size={16} />
                                                    </button>
                                                    <button onClick={() => tx.type === 'invoice' ? handleArchiveInvoiceClick(tx.id) : handleArchiveExpenseClick(tx.id)} className="p-2 hover:bg-white/10 rounded-lg text-indigo-400 hover:text-indigo-300" title={t('general.archive')}>
                                                        <Archive size={16} />
                                                    </button>
                                                    <button onClick={() => tx.type === 'invoice' ? deleteInvoice(tx.id) : deleteExpense(tx.id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400 hover:text-red-300" title={t('general.delete')}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="h-full overflow-y-auto custom-finance-scroll pr-2">
                            {!analyticsData ? <div className="text-center text-gray-500 py-10">{t('finance.reports.noData')}</div> : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                                        <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-primary-start" /> {t('finance.analytics.salesTrend')}</h4>
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={analyticsData.sales_trend}>
                                                    <defs>
                                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                                                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} tickFormatter={(str) => str.slice(5)} />
                                                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                                                    <Area type="monotone" dataKey="amount" stroke="#818cf8" strokeWidth={3} fill="url(#colorSales)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                                        <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><BarChart2 size={20} className="text-emerald-400" /> {t('finance.analytics.topProducts')}</h4>
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={analyticsData.top_products} layout="vertical" margin={{ left: 20 }}>
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="product_name" type="category" width={100} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                                                    <Bar dataKey="total_revenue" radius={[0, 6, 6, 0]} barSize={24}>
                                                        {analyticsData.top_products.map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* MODALS */}
            {showInvoiceModal && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-background-dark border border-glass-edge rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 custom-finance-scroll"><div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-white">{editingInvoiceId ? t('finance.editInvoice') : t('finance.createInvoice')}</h2><button onClick={closeInvoiceModal} className="text-gray-400 hover:text-white"><X size={24} /></button></div><form onSubmit={handleCreateOrUpdateInvoice} className="space-y-6"><div className="space-y-4">
                <h3 className="text-sm font-bold text-primary-start uppercase tracking-wider flex items-center gap-2"><User size={16} /> {t('caseCard.client')}</h3><div><label className="block text-sm text-gray-300 mb-1">{t('business.clientName')}</label><input required type="text" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={newInvoice.client_name} onChange={e => setNewInvoice({...newInvoice, client_name: e.target.value})} /></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="block text-sm text-gray-300 mb-1">{t('business.publicEmail')}</label><input type="email" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={newInvoice.client_email} onChange={e => setNewInvoice({...newInvoice, client_email: e.target.value})} /></div><div><label className="block text-sm text-gray-300 mb-1">{t('business.phone')}</label><input type="text" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={newInvoice.client_phone} onChange={e => setNewInvoice({...newInvoice, client_phone: e.target.value})} /></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="block text-sm text-gray-300 mb-1">{t('business.city')}</label><input type="text" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={newInvoice.client_city} onChange={e => setNewInvoice({...newInvoice, client_city: e.target.value})} /></div><div><label className="block text-sm text-gray-300 mb-1">{t('business.taxId')}</label><input type="text" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={newInvoice.client_tax_id} onChange={e => setNewInvoice({...newInvoice, client_tax_id: e.target.value})} /></div></div><div><label className="block text-sm text-gray-300 mb-1">{t('business.address')}</label><input type="text" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={newInvoice.client_address} onChange={e => setNewInvoice({...newInvoice, client_address: e.target.value})} /></div><div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10"><input type="checkbox" id="vatToggle" checked={includeVat} onChange={(e) => setIncludeVat(e.target.checked)} className="w-4 h-4 text-primary-start rounded border-gray-300 focus:ring-primary-start" /><label htmlFor="vatToggle" className="text-sm text-gray-300 cursor-pointer select-none">{t('finance.applyVat')}</label></div></div><div className="space-y-3 pt-4 border-t border-white/10"><h3 className="text-sm font-bold text-primary-start uppercase tracking-wider flex items-center gap-2"><FileText size={16} /> {t('finance.services')}</h3>{lineItems.map((item, index) => (<div key={index} className="flex flex-col sm:flex-row gap-2 items-center"><input type="text" placeholder={t('finance.description')} className="flex-1 w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={item.description} onChange={e => updateLineItem(index, 'description', e.target.value)} required /><input type="number" placeholder={t('finance.qty')} className="w-full sm:w-20 bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={item.quantity} onChange={e => updateLineItem(index, 'quantity', parseFloat(e.target.value))} min="1" /><input type="number" placeholder={t('finance.price')} className="w-full sm:w-24 bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={item.unit_price} onChange={e => updateLineItem(index, 'unit_price', parseFloat(e.target.value))} min="0" /><button type="button" onClick={() => removeLineItem(index)} className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg self-end sm:self-center"><Trash2 size={18} /></button></div>))}<button type="button" onClick={addLineItem} className="text-sm text-primary-start hover:underline flex items-center gap-1"><Plus size={14} /> {t('finance.addLine')}</button></div><div className="flex justify-end gap-3"><button type="button" onClick={closeInvoiceModal} className="px-4 py-2 text-gray-400">{t('general.cancel')}</button><button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold">{t('general.save')}</button></div></form></div></div>)}
            {showExpenseModal && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-background-dark border border-glass-edge rounded-2xl w-full max-w-md p-6"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white flex items-center gap-2"><MinusCircle size={20} className="text-rose-500" /> {editingExpenseId ? t('finance.editExpense') : t('finance.addExpense')}</h2><button onClick={closeExpenseModal} className="text-gray-400 hover:text-white"><X size={24} /></button></div><div className="mb-6"><input type="file" ref={receiptInputRef} className="hidden" accept="image/*,.pdf" onChange={(e) => setExpenseReceipt(e.target.files?.[0] || null)} /><button onClick={() => receiptInputRef.current?.click()} className={`w-full py-3 border border-dashed rounded-xl flex items-center justify-center gap-2 transition-all ${expenseReceipt ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>{expenseReceipt ? (<><CheckCircle size={18} /> {expenseReceipt.name}</>) : (<><Paperclip size={18} /> {t('finance.attachReceipt')}</>)}</button></div><form onSubmit={handleCreateOrUpdateExpense} className="space-y-5"><div><label className="block text-sm text-gray-300 mb-1">{t('finance.expenseCategory')}</label><input required type="text" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} /></div><div><label className="block text-sm text-gray-300 mb-1">{t('finance.amount')}</label><input required type="number" step="0.01" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})} /></div><div><label className="block text-sm text-gray-300 mb-1">{t('finance.date')}</label><DatePicker selected={expenseDate} onChange={(date: Date | null) => setExpenseDate(date)} locale={currentLocale} dateFormat="dd/MM/yyyy" className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" required /></div><div><label className="block text-sm text-gray-300 mb-1">{t('finance.description')}</label><textarea rows={2} className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} /></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={closeExpenseModal} className="px-4 py-2 text-gray-400">{t('general.cancel')}</button><button type="submit" className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold">{t('general.save')}</button></div></form></div></div>)}
            {showArchiveInvoiceModal && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-background-dark border border-glass-edge rounded-2xl w-full max-w-md p-6"><h2 className="text-xl font-bold text-white mb-4">{t('finance.archiveInvoice')}</h2><div className="mb-6"><label className="block text-sm text-gray-400 mb-1">{t('drafting.selectCaseLabel')}</label><select className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={selectedCaseForInvoice} onChange={(e) => setSelectedCaseForInvoice(e.target.value)}><option value="">{t('archive.generalNoCase')}</option>{cases.map(c => (<option key={c.id} value={c.id}>{c.title}</option>))}</select></div><div className="flex justify-end gap-3"><button onClick={() => setShowArchiveInvoiceModal(false)} className="px-4 py-2 text-gray-400">{t('general.cancel')}</button><button onClick={submitArchiveInvoice} className="px-6 py-2 bg-blue-600 text-white rounded-lg">{t('general.save')}</button></div></div></div>)}
            {showArchiveExpenseModal && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-background-dark border border-glass-edge rounded-2xl w-full max-w-md p-6"><h2 className="text-xl font-bold text-white mb-4">{t('finance.archiveExpenseTitle')}</h2><div className="mb-6"><label className="block text-sm text-gray-400 mb-1">{t('drafting.selectCaseLabel')}</label><select className="w-full bg-background-light border-glass-edge rounded-lg px-3 py-2 text-white" value={selectedCaseForInvoice} onChange={(e) => setSelectedCaseForInvoice(e.target.value)}><option value="">{t('archive.generalNoCase')}</option>{cases.map(c => (<option key={c.id} value={c.id}>{c.title}</option>))}</select></div><div className="flex justify-end gap-3"><button onClick={() => setShowArchiveExpenseModal(false)} className="px-4 py-2 text-gray-400">{t('general.cancel')}</button><button onClick={submitArchiveExpense} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">{t('general.save')}</button></div></div></div>)}
            {showImportModal && (<TransactionImporter onClose={() => setShowImportModal(false)} onSuccess={() => { loadInitialData(); setShowImportModal(false); }} t={t} />)}
            {viewingDoc && <PDFViewerModal documentData={viewingDoc} onClose={closePreview} onMinimize={closePreview} t={t} directUrl={viewingUrl} />}
        </motion.div>
    );
};