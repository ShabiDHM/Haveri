// FILE: src/components/business/FinanceTab.tsx
// PHOENIX PROTOCOL - FINANCE TAB V14.10 (REMOVE UNUSED IMPORT)

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    TrendingUp, TrendingDown, Calculator, MinusCircle, Plus, 
    BarChart2, Search, PiggyBank, Activity, Loader2,
    Sparkles, X, Users, Phone, Mail, MapPin,
    Trash2, ShoppingCart
} from 'lucide-react';
import { apiService } from '../../services/api';
import { Invoice, Expense, Document } from '../../data/types';
import { useTranslation } from 'react-i18next';
import PDFViewerModal from '../PDFViewerModal';
import { TransactionImporter } from './TransactionImporter'; 
import { 
    BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

import { useFinanceData } from '../../hooks/useFinanceData';
import { InvoiceModal } from './modals/InvoiceModal';
import { ExpenseModal } from './modals/ExpenseModal';
import { ClientImportModal } from './modals/ClientImportModal';
import { PosModal } from './modals/PosModal';
import { TransactionList, TransactionItem } from './finance/TransactionList';
import { Panel } from '../ui/Panel';
import { useAuth } from '../../context/AuthContext';

const HeroStatCard = ({ title, amount, icon, trend, type, onClick }: any) => {
    let borderTopClass = 'border-t-primary-start';
    let iconColor = 'text-primary-start';
    let iconBg = 'bg-primary-start/10';
    let amountColor = 'text-primary-start';
    
    if (type === 'income') { 
        borderTopClass = 'border-t-success-start';
        iconColor = 'text-success-start';
        iconBg = 'bg-success-start/10';
        amountColor = 'text-success-start';
    }
    if (type === 'expense') { 
        borderTopClass = 'border-t-danger-start';
        iconColor = 'text-danger-start';
        iconBg = 'bg-danger-start/10';
        amountColor = 'text-danger-start';
    }
    if (type === 'warning') { 
        borderTopClass = 'border-t-warning-start';
        iconColor = 'text-warning-start';
        iconBg = 'bg-warning-start/10';
        amountColor = 'text-warning-start';
    }
    
    return (
        <motion.div 
            whileHover={{ scale: 1.02, y: -2 }} 
            onClick={onClick} 
            className={`relative overflow-hidden rounded-2xl border border-border-main ${borderTopClass} border-t-4 bg-surface/80 backdrop-blur-sm p-3 sm:p-5 cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 hover-lift`}
        >
            <div className="flex justify-between items-start mb-2 sm:mb-3">
                <div className={`p-2 sm:p-2.5 rounded-xl ${iconBg} ${iconColor} border border-border-main`}>
                    {icon}
                </div>
                {trend && (
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-surface text-text-muted border border-border-main">
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-text-muted mb-1">
                    {title}
                </p>
                <h3 className={`text-lg sm:text-2xl font-bold ${amountColor} tracking-tight`}>
                    {amount}
                </h3>
            </div>
        </motion.div>
    );
};

const ActionButton = ({ icon, label, onClick, primary = false }: any) => (
    <button 
        onClick={onClick} 
        className={`flex items-center justify-center text-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 sm:py-4 rounded-2xl text-sm sm:text-base font-bold transition-all duration-300 group hover-lift shadow-sm w-full ${
            primary 
                ? 'btn-primary' 
                : 'bg-surface/80 backdrop-blur-sm border border-border-main hover:bg-hover hover:border-primary-start/50 text-text-secondary hover:text-text-primary'
        }`}
    >
        <span className="text-base sm:text-lg">{icon}</span>
        <span>{label}</span>
    </button>
);

const TabButton = ({ label, icon, isActive, onClick }: any) => (
    <button 
        onClick={onClick} 
        className={`flex-1 px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 hover-lift shadow-sm ${
            isActive 
                ? 'bg-primary-start/20 text-primary-start border border-primary-start/30' 
                : 'text-text-muted hover:text-text-primary hover:bg-hover border border-border-main hover:border-primary-start/30'
        }`}
    >
        <span className="relative z-10 text-sm sm:text-base">{icon}</span>
        <span className="relative z-10">{label}</span>
    </button>
);

export const FinanceTab: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { workspace } = useAuth();
    const financeData = useFinanceData({ workspaceId: workspace?.id });
    const { 
        loading, invoices, expenses, workspaces, analyticsData,
        totalExpenses, displayIncome, displayProfit, costOfGoodsSold,
        refreshData, deleteInvoice: hookDeleteInvoice, deleteExpense: hookDeleteExpense,
        deletePosTransaction: hookDeletePos, selectedYear 
    } = financeData;

    const [activeTab, setActiveTab] = useState<'transactions' | 'reports' | 'partners'>('transactions');
    const [partners, setPartners] = useState<any[]>([]);
    const [partnersLoading, setPartnersLoading] = useState(false);
    const [openingDocId, setOpeningDocId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false); 
    const [showClientImportModal, setShowClientImportModal] = useState(false);
    const [showPosModal, setShowPosModal] = useState(false);
    const [showArchiveInvoiceModal, setShowArchiveInvoiceModal] = useState(false);
    const [showArchiveExpenseModal, setShowArchiveExpenseModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
    const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
    const [selectedWorkspaceForInvoice, setSelectedWorkspaceForInvoice] = useState<string>(""); 
    const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
    const [viewingUrl, setViewingUrl] = useState<string | null>(null);
    const [kpiModalOpen, setKpiModalOpen] = useState(false);
    const [kpiAnalysis, setKpiAnalysis] = useState<any>(null);
    const [kpiLoading, setKpiLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'partners') {
            setPartnersLoading(true);
            apiService.getPartners().then(data => {
                setPartners(data);
                setPartnersLoading(false);
            }).catch(() => setPartnersLoading(false));
        }
    }, [activeTab]);

    const handleKpiClick = async (type: string, title: string) => {
        setKpiModalOpen(true); setKpiAnalysis({ type: title, summary: '', contributors: [] }); setKpiLoading(true);
        try { 
            const data = await apiService.getKpiInsight(type, selectedYear); 
            setKpiAnalysis({ type: title, summary: data.summary, contributors: data.key_contributors }); 
        } 
        catch { setKpiAnalysis({ type: title, summary: t('finance.smartAnalyst.failed'), contributors: [] }); } 
        finally { setKpiLoading(false); }
    };

    const handleDeletePartner = async (id: string) => {
        if (!window.confirm(t('general.confirmDelete', 'A jeni të sigurt që dëshironi ta fshini këtë partner?'))) return;
        try {
            await apiService.deletePartner(id);
            setPartners(prev => prev.filter(p => p.id !== id));
        } catch {
            alert(t('error.generic'));
        }
    };

    // --- EXCEL EXPORT HANDLER (with date filters) ---
    const handleExportExcel = async (params: { year?: number; month?: number; day?: number; label: string }) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                alert(t('error.unauthorized'));
                return;
            }
            const caseId = workspace?.id || '';
            let url = `${process.env.REACT_APP_API_URL || '/api/v1'}/finance/invoices/export/excel?case_id=${caseId}`;
            if (params.year) url += `&year=${params.year}`;
            if (params.month) url += `&month=${params.month}`;
            if (params.day) url += `&day=${params.day}`;
            
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Export failed');
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `faturat_${params.label.replace(/\s/g, '_')}_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Export error:', error);
            alert(t('error.generic'));
        }
    };

    // --- EXCLUDE POS TRANSACTIONS: they are already represented by invoices ---
    const allTransactions: TransactionItem[] = useMemo(() => {
        const combined: TransactionItem[] = [
            ...invoices.map(i => ({ 
                id: i.id, 
                type: 'invoice' as const, 
                date: i.issue_date || new Date().toISOString(), 
                amount: i.total_amount, 
                label: i.client_name || 'Faturë pa emër', 
                raw: i 
            })),
            ...expenses.map(e => ({ 
                id: e.id, 
                type: 'expense' as const, 
                date: e.date || new Date().toISOString(), 
                amount: e.amount, 
                label: e.category, 
                raw: e 
            })),
            // POS transactions removed to avoid duplication (each POS creates an invoice)
        ];
        return combined.filter(tx => !searchTerm || tx.label.toLowerCase().includes(searchTerm.toLowerCase()) || tx.amount.toString().includes(searchTerm))
                       .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [invoices, expenses, searchTerm, t]);

    const filteredPartners = useMemo(() => {
        return partners.filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [partners, searchTerm]);

    const closePreview = () => { if (viewingUrl) window.URL.revokeObjectURL(viewingUrl); setViewingUrl(null); setViewingDoc(null); };

    const handleUnifiedBulkDelete = async (ids: any) => {
        try { await apiService.bulkDeleteTransactions(ids); alert(t('general.saveSuccess')); refreshData(); } 
        catch { alert(t('error.generic')); }
    };

    const handleViewInvoice = async (invoice: Invoice) => { setOpeningDocId(invoice.id); try { const blob = await apiService.getInvoicePdfBlob(invoice.id, i18n.language || 'sq'); const url = window.URL.createObjectURL(blob); setViewingUrl(url); setViewingDoc({ id: invoice.id, file_name: `${t('finance.invoicePrefix')}${invoice.invoice_number}`, mime_type: 'application/pdf', status: 'READY' } as any); } catch { alert(t('error.generic')); } finally { setOpeningDocId(null); } };
    const handleDownloadInvoice = async (id: string) => { try { await apiService.downloadInvoicePdf(id, i18n.language || 'sq'); } catch { alert(t('error.generic')); } };
    
    const handleViewExpense = async (expense: Expense) => { 
        setOpeningDocId(expense.id); 
        try { 
            let url: string, file_name: string, mime_type: string; 
            if (expense.receipt_url) { 
                const { blob, filename } = await apiService.getExpenseReceiptBlob(expense.id); 
                url = window.URL.createObjectURL(blob); file_name = filename; 
                const ext = filename.split('.').pop()?.toLowerCase(); mime_type = ext === 'pdf' ? 'application/pdf' : 'image/jpeg'; 
            } else { 
                const file = generateDigitalReceipt(expense); url = window.URL.createObjectURL(file); file_name = file.name; mime_type = 'text/plain'; 
            } 
            setViewingUrl(url); setViewingDoc({ id: expense.id, file_name, mime_type, status: 'READY' } as any); 
        } catch { alert(t('error.generic')); } finally { setOpeningDocId(null); } 
    };

    const handleDownloadExpense = async (expense: Expense) => { 
        try { 
            let url: string, filename: string; 
            if (expense.receipt_url) { 
                const { blob, filename: fn } = await apiService.getExpenseReceiptBlob(expense.id); 
                url = window.URL.createObjectURL(blob); filename = fn; 
            } else { 
                const file = generateDigitalReceipt(expense); url = window.URL.createObjectURL(file); filename = file.name; 
            } 
            const a = document.createElement('a'); a.href = url; a.download = filename; 
            document.body.appendChild(a); a.click(); document.body.removeChild(a); 
            if (!expense.receipt_url) window.URL.revokeObjectURL(url); 
        } catch { alert(t('error.generic')); } 
    };

    const generateDigitalReceipt = (expense: Expense): File => { 
        const content = `${t('receiptTitle', 'DËFTESË DIGJITALE')}\n------------------------------------------------\n${t('receiptCategory', 'Kategoria:')}   ${expense.category}\n${t('receiptAmount', 'Shuma:')}       €${expense.amount.toFixed(2)}\n${t('receiptDate', 'Data:')}        ${new Date(expense.date).toLocaleDateString('sq-AL')}\n${t('receiptDescription', 'Përshkrimi:')}  ${expense.description || t('receiptNoDescription', 'Pa përshkrim')}\n------------------------------------------------\n${t('receiptGeneratedBy', 'Gjeneruar nga Haveri AI')}`; 
        const blob = new Blob([content], { type: 'text/plain' }); 
        return new File([blob], `${t('receiptFileNamePrefix', 'Deftese')}_${expense.category.replace(/\s+/g, '_')}_${expense.date}.txt`, { type: 'text/plain' }); 
    };

    const submitArchiveInvoice = async () => { if (!selectedInvoiceId) return; try { await apiService.archiveInvoice(selectedInvoiceId, selectedWorkspaceForInvoice || undefined); alert(t('general.saveSuccess')); setShowArchiveInvoiceModal(false); } catch { alert(t('error.generic')); } };
    const submitArchiveExpense = async () => { 
        if (!selectedExpenseId) return; 
        const expense = expenses.find(e => e.id === selectedExpenseId); 
        if (!expense) return; 
        try { 
            let f: File; 
            if (expense.receipt_url) { const { blob, filename } = await apiService.getExpenseReceiptBlob(expense.id); f = new File([blob], filename, { type: blob.type }); } 
            else { f = generateDigitalReceipt(expense); } 
            await apiService.uploadArchiveItem(f, f.name, "EXPENSE", selectedWorkspaceForInvoice || undefined); 
            alert(t('general.saveSuccess')); setShowArchiveExpenseModal(false); 
        } catch { alert(t('error.generic')); } 
    };

    const handleArchiveInvoice = (id: string) => { setSelectedInvoiceId(id); setShowArchiveInvoiceModal(true); };
    const handleArchiveExpense = (id: string) => { setSelectedExpenseId(id); setShowArchiveExpenseModal(true); };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
            <style>{`
                .custom-finance-scroll::-webkit-scrollbar { width: 6px; } 
                .custom-finance-scroll::-webkit-scrollbar-thumb { background: var(--primary-start); border-radius: 10px; opacity: 0.3; } 
                select option { background-color: var(--bg-card); color: var(--text-primary); }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <HeroStatCard title={t('finance.income')} amount={`€${(displayIncome || 0).toFixed(2)}`} icon={<TrendingUp size={20} className="sm:w-6 sm:h-6" />} type="income" onClick={() => handleKpiClick('income', t('finance.income'))} />
                <HeroStatCard title={t('finance.cogs')} amount={`€${(costOfGoodsSold || 0).toFixed(2)}`} icon={<Calculator size={20} className="sm:w-6 sm:h-6" />} type="warning" onClick={() => handleKpiClick('cogs', t('finance.cogs'))} />
                <HeroStatCard title={t('finance.balanceSub')} amount={`€${(displayProfit || 0).toFixed(2)}`} icon={<PiggyBank size={20} className="sm:w-6 sm:h-6" />} type={displayProfit >= 0 ? 'income' : 'expense'} trend="+12%" onClick={() => handleKpiClick('profit', t('finance.balanceSub'))} />
                <HeroStatCard title={t('finance.expense')} amount={`€${(totalExpenses || 0).toFixed(2)}`} icon={<TrendingDown size={20} className="sm:w-6 sm:h-6" />} type="expense" onClick={() => handleKpiClick('expense', t('finance.expense'))} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border border-border-main bg-surface/30 backdrop-blur-sm">
                <ActionButton primary icon={<Plus size={16} className="sm:w-5 sm:h-5" />} label={t('finance.createInvoice')} onClick={() => { setSelectedInvoice(null); setShowInvoiceModal(true); }} />
                <ActionButton icon={<ShoppingCart size={16} className="sm:w-5 sm:h-5" />} label="Krijo shitje" onClick={() => setShowPosModal(true)} />
                <ActionButton icon={<MinusCircle size={16} className="sm:w-5 sm:h-5" />} label={t('finance.addExpense')} onClick={() => { setSelectedExpense(null); setShowExpenseModal(true); }} />
            </div>

            <Panel className="p-0 overflow-hidden min-h-[500px] sm:min-h-[600px] flex flex-col border border-border-main bg-surface/30 backdrop-blur-sm shadow-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 pb-4 sm:pb-6 px-4 sm:px-6 pt-4 sm:pt-6">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary tracking-tight flex items-center gap-2 sm:gap-3">
                        <Activity className="text-primary-start" size={20} />
                        {t('finance.activityAndReports')}
                    </h2>
                    <div className="w-full sm:w-auto flex bg-surface/50 p-1 rounded-2xl gap-1 overflow-x-auto scrollbar-hide">
                        <TabButton label={t('finance.tabTransactions')} icon={<Activity size={14} className="sm:w-4 sm:h-4" />} isActive={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} />
                        <TabButton label={t('finance.tabReports')} icon={<BarChart2 size={14} className="sm:w-4 sm:h-4" />} isActive={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                        <TabButton label={t('clients.title', 'Partnerët')} icon={<Users size={14} className="sm:w-4 sm:h-4" />} isActive={activeTab === 'partners'} onClick={() => setActiveTab('partners')} />
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative px-4 sm:px-6 pb-4 sm:pb-6">
                    {(activeTab === 'transactions' || activeTab === 'partners') && (
                        <div className="mb-4 sm:mb-6 relative group">
                            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-text-muted group-focus-within:text-primary-start transition-colors" />
                            <input 
                                type="text" 
                                placeholder={activeTab === 'partners' ? t('general.searchPartners', 'Kërko partnerë...') : t('header.searchPlaceholder')} 
                                className="glass-input w-full pl-9 sm:pl-12 py-2 sm:py-4 bg-surface/80 backdrop-blur-sm focus:bg-surface transition-all border border-border-main text-text-primary placeholder:text-text-muted rounded-xl text-sm sm:text-base focus:outline-none" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>
                    )}

                    {activeTab === 'transactions' && (
                        <div className="h-full overflow-y-auto custom-finance-scroll pr-1 sm:pr-2 space-y-3 pb-4 sm:pb-20">
                            {loading ? (
                                <div className="flex justify-center h-48 items-center"><Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-primary-start" /></div>
                            ) : (
                                <TransactionList 
                                    allTransactions={allTransactions} 
                                    openingDocId={openingDocId} 
                                    onEditInvoice={(i:any) => {setSelectedInvoice(i); setShowInvoiceModal(true);}} 
                                    onEditExpense={(e:any) => {setSelectedExpense(e); setShowExpenseModal(true);}} 
                                    onViewInvoice={handleViewInvoice} 
                                    onViewExpense={handleViewExpense} 
                                    onDownloadInvoice={handleDownloadInvoice} 
                                    onDownloadExpense={handleDownloadExpense} 
                                    onArchiveInvoice={handleArchiveInvoice} 
                                    onArchiveExpense={handleArchiveExpense} 
                                    onDeleteInvoice={(id:any) => hookDeleteInvoice(id)} 
                                    onDeleteExpense={(id:any) => hookDeleteExpense(id)} 
                                    onDeletePos={(id:any) => hookDeletePos(id)} 
                                    onViewSourceDocument={() => {}} 
                                    onBulkDelete={handleUnifiedBulkDelete}
                                    onExportExcel={handleExportExcel}
                                />
                            )}
                        </div>
                    )}

                    {activeTab === 'partners' && (
                        <div className="h-full overflow-y-auto custom-finance-scroll pr-1 sm:pr-2 space-y-3 pb-4 sm:pb-20">
                            {partnersLoading ? (
                                <div className="flex justify-center h-48 items-center"><Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-primary-start" /></div>
                            ) : filteredPartners.length === 0 ? (
                                <div className="text-center text-text-muted py-10">{t('general.noPartnersFound', 'Nuk u gjet asnjë partner.')}</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                                    {filteredPartners.map((partner) => (
                                        <motion.div key={partner.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface/30 backdrop-blur-sm border border-border-main rounded-2xl p-3 sm:p-5 hover:border-primary-start/30 transition-all group relative hover-lift shadow-sm">
                                            <div className="flex justify-between items-start mb-3 sm:mb-4">
                                                <div className="p-2 sm:p-3 rounded-xl bg-primary-start/10 text-primary-start border border-border-main"><Users size={16} className="sm:w-5 sm:h-5" /></div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={`text-[10px] sm:text-xs font-black uppercase tracking-widest px-2 py-1 rounded-lg ${partner.type === 'CLIENT' ? 'bg-success-start/20 text-success-start border border-success-start/30' : 'bg-warning-start/20 text-warning-start border border-warning-start/30'}`}>
                                                        {partner.type === 'CLIENT' ? 'Klient' : 'Furnitor'}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleDeletePartner(partner.id)} className="p-1.5 rounded-md bg-surface/50 text-danger-start hover:bg-danger-start hover:text-text-inverse transition-all border border-border-main" title={t('general.delete')}><Trash2 size={12} className="sm:w-3.5 sm:h-3.5"/></button>
                                                    </div>
                                                </div>
                                            </div>
                                            <h4 className="text-base sm:text-lg font-bold text-text-primary mb-2 sm:mb-3 group-hover:text-primary-start transition-colors">{partner.name}</h4>
                                            <div className="space-y-1 sm:space-y-2">
                                                {partner.email && <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-text-muted"><Mail size={12} className="sm:w-3.5 sm:h-3.5 text-primary-start/50" /> {partner.email}</div>}
                                                {partner.phone && <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-text-muted"><Phone size={12} className="sm:w-3.5 sm:h-3.5 text-primary-start/50" /> {partner.phone}</div>}
                                                {partner.address && <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-text-muted"><MapPin size={12} className="sm:w-3.5 sm:h-3.5 text-primary-start/50" /> {partner.address}</div>}
                                            </div>
                                            {partner.tax_id && <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border-main flex justify-between items-center"><span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-text-muted">NIPT / TAX ID</span><span className="text-[10px] sm:text-xs font-mono text-text-secondary">{partner.tax_id}</span></div>}
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="h-full overflow-y-auto custom-finance-scroll pr-1 sm:pr-2">
                            {!analyticsData ? ( <div className="text-center text-text-muted py-10">{t('finance.reports.noData')}</div> ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                                    <div className="bg-surface/30 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border-main shadow-sm">
                                        <h4 className="text-base sm:text-lg font-bold text-text-primary mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3"><TrendingUp size={20} className="sm:w-6 sm:h-6 text-primary-start" /> {t('finance.analytics.salesTrend')}</h4>
                                        <div className="h-[250px] sm:h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%"><AreaChart data={analyticsData.sales_trend}><defs><linearGradient id="colorSales" x1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} /><XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(str) => str.slice(5)} /><YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} tickMargin={8} /><Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)', borderRadius: '16px' }} itemStyle={{ color: 'var(--text-primary)' }} formatter={(value: any, name: any) => [`€${value.toFixed(2)}`, t(`finance.analytics.keys.${name}`, name) as string]} /><Area type="monotone" connectNulls={true} dataKey="amount" stroke="#3b82f6" strokeWidth={2} fill="url(#colorSales)" /></AreaChart></ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="bg-surface/30 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border-main shadow-sm">
                                        <h4 className="text-base sm:text-lg font-bold text-text-primary mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3"><BarChart2 size={20} className="sm:w-6 sm:h-6 text-success-start" /> {t('finance.analytics.topProducts')}</h4>
                                        <div className="h-[250px] sm:h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%"><BarChart data={analyticsData.top_products} layout="vertical" margin={{ left: 10 }}><XAxis type="number" hide /><YAxis dataKey="product_name" type="category" width={100} stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} /><Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)', borderRadius: '16px' }} itemStyle={{ color: 'var(--text-primary)' }} formatter={(value: any, name: any) => [`€${value.toFixed(2)}`, t(`finance.analytics.keys.${name}`, name) as string]} /><Bar dataKey="total_revenue" radius={[0, 8, 8, 0]} barSize={24}>{analyticsData.top_products.map((_: any, index: number) => (<Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />))}</Bar></BarChart></ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Panel>

            <AnimatePresence>
                {kpiModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/50 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="glass-panel w-full max-w-lg shadow-xl overflow-hidden relative border border-border-main">
                            <div className="p-4 sm:p-6 border-b border-border-main bg-primary-start/20 flex justify-between items-center">
                                <h3 className="text-lg sm:text-xl font-bold text-text-primary flex items-center gap-2">
                                    <Sparkles size={16} className="sm:w-5 sm:h-5 text-warning-start" />
                                    {kpiAnalysis?.type}
                                </h3>
                                <button onClick={() => setKpiModalOpen(false)} className="p-1 hover:bg-hover rounded-lg text-text-muted transition-colors">
                                    <X size={18} className="sm:w-5 sm:h-5"/>
                                </button>
                            </div>
                            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                                {kpiLoading ? (
                                    <div className="flex flex-col items-center py-6 sm:py-10 gap-4">
                                        <Loader2 size={32} className="sm:w-10 sm:h-10 animate-spin text-primary-start" />
                                        <p className="text-text-muted animate-pulse text-sm sm:text-base">{t('finance.smartAnalyst.analyzing')}</p>
                                    </div>
                                ) : (
                                    <>
                                        {kpiAnalysis?.summary && (
                                            <div className="bg-primary-start/10 border border-primary-start/30 rounded-xl p-3 sm:p-4">
                                                <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-primary-start mb-2">{t('finance.smartAnalyst.executiveSummary')}</h4>
                                                <p className="text-text-primary leading-relaxed text-sm sm:text-base">{kpiAnalysis?.summary}</p>
                                            </div>
                                        )}
                                        {kpiAnalysis?.contributors && kpiAnalysis.contributors.length > 0 && (
                                            <div>
                                                <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-text-muted mb-3">{t('finance.smartAnalyst.keyContributors')}</h4>
                                                <div className="space-y-2">
                                                    {kpiAnalysis.contributors.map((c:any, i:any) => (
                                                        <div key={i} className="flex items-center gap-3 p-2 sm:p-3 bg-surface rounded-lg border border-border-main">
                                                            <div className="w-2 h-2 rounded-full bg-success-start" />
                                                            <span className="text-xs sm:text-sm text-text-secondary">{c}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <InvoiceModal isOpen={showInvoiceModal} onClose={() => { setShowInvoiceModal(false); setSelectedInvoice(null); }} invoiceToEdit={selectedInvoice} onSuccess={refreshData} />
            <ExpenseModal isOpen={showExpenseModal} onClose={() => { setShowExpenseModal(false); setSelectedExpense(null); }} expenseToEdit={selectedExpense} onSuccess={refreshData} />
            <ClientImportModal isOpen={showClientImportModal} onClose={() => setShowClientImportModal(false)} onSuccess={() => { refreshData(); if (activeTab === 'partners') { apiService.getPartners().then(setPartners); } }} />
            <PosModal isOpen={showPosModal} onClose={() => setShowPosModal(false)} onSuccess={refreshData} />
            
            {showArchiveInvoiceModal && (
                <div className="fixed inset-0 bg-canvas/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-panel w-full max-w-md p-4 sm:p-6 shadow-xl border border-border-main">
                        <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-4">{t('finance.archiveInvoice')}</h2>
                        <select className="glass-input w-full mb-6 border border-border-main bg-surface text-text-primary rounded-xl text-sm sm:text-base" value={selectedWorkspaceForInvoice} onChange={(e) => setSelectedWorkspaceForInvoice(e.target.value)}>
                            <option value="">{t('archive.generalNoCase')}</option>
                            {workspaces.map(w => (<option key={w.id} value={w.id}>{w.title}</option>))}
                        </select>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowArchiveInvoiceModal(false)} className="glass-input !bg-surface hover:bg-hover transition-colors px-4 sm:px-5 py-2 border border-border-main rounded-xl hover-lift shadow-sm text-sm sm:text-base">{t('general.cancel')}</button>
                            <button onClick={submitArchiveInvoice} className="btn-primary px-5 sm:px-6 py-2 rounded-xl hover-lift shadow-sm text-sm sm:text-base">{t('general.save')}</button>
                        </div>
                    </div>
                </div>
            )}

            {showArchiveExpenseModal && (
                <div className="fixed inset-0 bg-canvas/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-panel w-full max-w-md p-4 sm:p-6 shadow-xl border border-border-main">
                        <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-4">{t('finance.archiveExpenseTitle')}</h2>
                        <select className="glass-input w-full mb-6 border border-border-main bg-surface text-text-primary rounded-xl text-sm sm:text-base" value={selectedWorkspaceForInvoice} onChange={(e) => setSelectedWorkspaceForInvoice(e.target.value)}>
                            <option value="">{t('archive.generalNoCase')}</option>
                            {workspaces.map(w => (<option key={w.id} value={w.id}>{w.title}</option>))}
                        </select>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowArchiveExpenseModal(false)} className="glass-input !bg-surface hover:bg-hover transition-colors px-4 sm:px-5 py-2 border border-border-main rounded-xl hover-lift shadow-sm text-sm sm:text-base">{t('general.cancel')}</button>
                            <button onClick={submitArchiveExpense} className="btn-primary px-5 sm:px-6 py-2 rounded-xl hover-lift shadow-sm text-sm sm:text-base">{t('general.save')}</button>
                        </div>
                    </div>
                </div>
            )}

            {showImportModal && (<TransactionImporter onClose={() => setShowImportModal(false)} onSuccess={() => { refreshData(); setShowImportModal(false); }} t={t} />)}
            {viewingDoc && <PDFViewerModal documentData={viewingDoc} onClose={closePreview} onMinimize={closePreview} t={t} directUrl={viewingUrl} isAuth={false} />}
        </motion.div>
    );
};