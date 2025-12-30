// FILE: src/components/business/FinanceTab.tsx
// PHOENIX PROTOCOL - REPORT FIX V1.1 (CORRECT DATA BINDING)
// 1. FIX (CHART): Ensured the Bar component uses 'total_revenue' and the YAxis uses 'product_name'.

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
    TrendingUp, TrendingDown, Calculator, MinusCircle, Plus, 
    BarChart2, Search, PiggyBank, FileSpreadsheet, Activity, Loader2
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
import { TransactionList, TransactionItem } from './finance/TransactionList';

const HeroStatCard = ({ title, amount, icon, trend, type }: { title: string, amount: string, icon: React.ReactNode, trend?: string, type: 'income' | 'expense' | 'neutral' | 'warning' }) => {
    let gradient = 'from-blue-500/20 to-blue-500/5';
    let border = 'border-blue-500/30';
    let iconColor = 'text-blue-400';
    let iconBg = 'bg-blue-500/20';

    if (type === 'income') { 
        gradient = 'from-emerald-500/20 to-emerald-500/5'; 
        border = 'border-emerald-500/30';
        iconColor = 'text-emerald-400';
        iconBg = 'bg-emerald-500/20';
    }
    if (type === 'expense') { 
        gradient = 'from-rose-500/20 to-rose-500/5';
        border = 'border-rose-500/30';
        iconColor = 'text-rose-400';
        iconBg = 'bg-rose-500/20';
    }
    if (type === 'warning') { 
        gradient = 'from-amber-500/20 to-amber-500/5';
        border = 'border-amber-500/30';
        iconColor = 'text-amber-400';
        iconBg = 'bg-amber-500/20';
    }

    return (
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} border ${border} p-6 backdrop-blur-md hover:scale-[1.02] transition-transform duration-300 group`}>
            <div className={`absolute -top-10 -right-10 w-32 h-32 ${iconBg} blur-[60px] rounded-full pointer-events-none opacity-50`} />
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3 rounded-2xl ${iconBg} ${iconColor} border ${border} shadow-lg`}>
                    {icon}
                </div>
                {trend && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-black/40 text-gray-300 border border-white/10 backdrop-blur-sm">
                        {trend}
                    </span>
                )}
            </div>
            <div className="relative z-10">
                <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-1 opacity-80">{title}</p>
                <h3 className="text-3xl font-black text-white tracking-tight">{amount}</h3>
            </div>
        </div>
    );
};

const ActionButton = ({ icon, label, onClick, primary = false }: { icon: React.ReactNode, label: string, onClick: () => void, primary?: boolean }) => (
    <button 
        onClick={onClick} 
        className={`
            flex items-center justify-center text-center gap-3 px-6 py-4 rounded-2xl text-base font-bold transition-all duration-300 group
            ${primary 
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 border border-blue-400/50' 
                : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 border border-white/10 hover:border-white/20'
            }
        `}
    >
        <span className={`transition-transform duration-300 group-hover:scale-110 ${primary ? 'text-white' : 'text-blue-400'}`}>{icon}</span>
        <span>{label}</span>
    </button>
);

const TabButton = ({ label, icon, isActive, onClick }: { label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void }) => (
    <button 
        onClick={onClick} 
        className={`
            flex-1 sm:flex-initial relative px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2
            ${isActive 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }
        `}
    >
        <span className="relative z-10">{icon}</span>
        <span className="relative z-10 hidden sm:inline">{label}</span>
        <span className="relative z-10 sm:hidden">{label}</span>
    </button>
);

export const FinanceTab: React.FC = () => {
    type ActiveTab = 'transactions' | 'reports';

    const { t, i18n } = useTranslation();

    const {
        loading, invoices, expenses, cases, posTransactions, analyticsData,
        totalExpenses, displayIncome, displayProfit, costOfGoodsSold,
        refreshData, deleteInvoice: hookDeleteInvoice, deleteExpense: hookDeleteExpense, deletePosTransaction: hookDeletePos
    } = useFinanceData();

    const [activeTab, setActiveTab] = useState<ActiveTab>('transactions');
    const [openingDocId, setOpeningDocId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false); 
    const [showArchiveInvoiceModal, setShowArchiveInvoiceModal] = useState(false);
    const [showArchiveExpenseModal, setShowArchiveExpenseModal] = useState(false);
    
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
    const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
    const [selectedCaseForInvoice, setSelectedCaseForInvoice] = useState<string>("");
    
    const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
    const [viewingUrl, setViewingUrl] = useState<string | null>(null);

    const allTransactions: TransactionItem[] = useMemo(() => {
        const combined: TransactionItem[] = [
            ...invoices.map(i => ({ id: i.id, type: 'invoice' as const, date: i.issue_date, amount: i.total_amount, label: i.client_name, raw: i })),
            ...expenses.map(e => ({ id: e.id, type: 'expense' as const, date: e.date, amount: e.amount, label: e.category, raw: e })),
            ...posTransactions.map(p => ({ 
                id: (p as any).id || (p as any)._id, 
                type: 'pos' as const, 
                date: p.transaction_date || (p as any).date || new Date().toISOString(), 
                amount: p.total_price ?? (p as any).amount ?? 0, 
                label: p.product_name || (p as any).description || t('finance.posSale'),
                raw: p 
            })),
        ];
        
        const filtered = combined.filter(tx => {
            if (!searchTerm) return true;
            return tx.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   tx.amount.toString().includes(searchTerm);
        });

        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [invoices, expenses, posTransactions, searchTerm, t]);

    const closePreview = () => { if (viewingUrl) window.URL.revokeObjectURL(viewingUrl); setViewingUrl(null); setViewingDoc(null); };

    const handleEditInvoice = (invoice: Invoice) => { setSelectedInvoice(invoice); setShowInvoiceModal(true); };
    const handleEditExpense = (expense: Expense) => { setSelectedExpense(expense); setShowExpenseModal(true); };
    
    const handleDeleteInvoice = async (id: string) => { if(!window.confirm(t('general.confirmDelete'))) return; try { await hookDeleteInvoice(id); } catch { alert(t('documentsPanel.deleteFailed')); } };
    const handleDeleteExpense = async (id: string) => { if(!window.confirm(t('general.confirmDelete'))) return; try { await hookDeleteExpense(id); } catch { alert(t('error.generic')); } };
    const handleDeletePos = async (id: string) => { if(!window.confirm(t('general.confirmDelete'))) return; try { await hookDeletePos(id); } catch { alert(t('documentsPanel.deleteFailed')); } };

    const handleViewInvoice = async (invoice: Invoice) => { setOpeningDocId(invoice.id); try { const blob = await apiService.getInvoicePdfBlob(invoice.id, i18n.language || 'sq'); const url = window.URL.createObjectURL(blob); setViewingUrl(url); setViewingDoc({ id: invoice.id, file_name: `${t('finance.invoicePrefix')}${invoice.invoice_number}`, mime_type: 'application/pdf', status: 'READY' } as any); } catch { alert(t('error.generic')); } finally { setOpeningDocId(null); } };
    const handleDownloadInvoice = async (id: string) => { try { await apiService.downloadInvoicePdf(id, i18n.language || 'sq'); } catch { alert(t('error.generic')); } };
    const handleArchiveInvoice = (id: string) => { setSelectedInvoiceId(id); setShowArchiveInvoiceModal(true); };
    
    const handleViewExpense = async (expense: Expense) => { setOpeningDocId(expense.id); try { let url: string, file_name: string, mime_type: string; if (expense.receipt_url) { const { blob, filename } = await apiService.getExpenseReceiptBlob(expense.id); url = window.URL.createObjectURL(blob); file_name = filename; const ext = filename.split('.').pop()?.toLowerCase(); mime_type = ext === 'pdf' ? 'application/pdf' : 'image/jpeg'; } else { const file = generateDigitalReceipt(expense); url = window.URL.createObjectURL(file); file_name = file.name; mime_type = 'text/plain'; } setViewingUrl(url); setViewingDoc({ id: expense.id, file_name, mime_type, status: 'READY' } as any); } catch { alert(t('error.receiptNotFound')); } finally { setOpeningDocId(null); } };
    const handleDownloadExpense = async (expense: Expense) => { try { let url: string, filename: string; if (expense.receipt_url) { const { blob, filename: fn } = await apiService.getExpenseReceiptBlob(expense.id); url = window.URL.createObjectURL(blob); filename = fn; } else { const file = generateDigitalReceipt(expense); url = window.URL.createObjectURL(file); filename = file.name; } const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); if (!expense.receipt_url) window.URL.revokeObjectURL(url); } catch { alert(t('error.generic')); } };
    const handleArchiveExpense = (id: string) => { setSelectedExpenseId(id); setShowArchiveExpenseModal(true); };

    const generateDigitalReceipt = (expense: Expense): File => {
        const content = `${t('finance.digitalReceipt.title')}\n------------------------------------------------\n${t('finance.digitalReceipt.category')}   ${expense.category}\n${t('finance.digitalReceipt.amount')}       €${expense.amount.toFixed(2)}\n${t('finance.digitalReceipt.date')}        ${new Date(expense.date).toLocaleDateString('sq-AL')}\n${t('finance.digitalReceipt.description')}  ${expense.description || t('finance.digitalReceipt.noDescription')}\n------------------------------------------------\n${t('finance.digitalReceipt.generated')}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const fileName = `${t('finance.digitalReceipt.fileNamePrefix')}_${expense.category.replace(/\s+/g, '_')}_${expense.date}.txt`;
        return new File([blob], fileName, { type: 'text/plain' });
    };

    const submitArchiveInvoice = async () => { if (!selectedInvoiceId) return; try { await apiService.archiveInvoice(selectedInvoiceId, selectedCaseForInvoice || undefined); alert(t('general.saveSuccess')); setShowArchiveInvoiceModal(false); setSelectedCaseForInvoice(""); } catch { alert(t('error.generic')); } };
    const submitArchiveExpense = async () => { if (!selectedExpenseId) return; try { const ex = expenses.find(e => e.id === selectedExpenseId); if (!ex) return; let fileToUpload: File; if (ex.receipt_url) { const { blob, filename } = await apiService.getExpenseReceiptBlob(ex.id); fileToUpload = new File([blob], filename, { type: blob.type }); } else { fileToUpload = generateDigitalReceipt(ex); } await apiService.uploadArchiveItem(fileToUpload, fileToUpload.name, "EXPENSE", selectedCaseForInvoice || undefined, undefined); alert(t('general.saveSuccess')); setShowArchiveExpenseModal(false); setSelectedCaseForInvoice(""); } catch { alert(t('error.generic')); } };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <style>{`
                .custom-finance-scroll::-webkit-scrollbar { width: 6px; } 
                .custom-finance-scroll::-webkit-scrollbar-track { background: transparent; } 
                .custom-finance-scroll::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.3); border-radius: 10px; } 
                .custom-finance-scroll::-webkit-scrollbar-thumb:hover { background: rgba(59,130,246,0.5); }
                select option { background-color: #0f172a; color: #f9fafb; }
            `}</style>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <HeroStatCard title={t('finance.income')} amount={`€${(displayIncome || 0).toFixed(2)}`} icon={<TrendingUp size={24} />} type="income" />
                <HeroStatCard title={t('finance.cogs')} amount={`€${(costOfGoodsSold || 0).toFixed(2)}`} icon={<Calculator size={24} />} type="warning" />
                <HeroStatCard title={t('finance.balanceSub')} amount={`€${(displayProfit || 0).toFixed(2)}`} icon={<PiggyBank size={24} />} type="neutral" trend="+12%"/>
                <HeroStatCard title={t('finance.expense')} amount={`€${(totalExpenses || 0).toFixed(2)}`} icon={<TrendingDown size={24} />} type="expense" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-900/40 p-4 rounded-3xl border border-white/5 backdrop-blur-md">
                <ActionButton primary icon={<Plus size={20} />} label={t('finance.createInvoice')} onClick={() => { setSelectedInvoice(null); setShowInvoiceModal(true); }} />
                <ActionButton icon={<FileSpreadsheet size={20} />} label={t('finance.import.title')} onClick={() => setShowImportModal(true)} />
                <ActionButton icon={<MinusCircle size={20} />} label={t('finance.addExpense')} onClick={() => { setSelectedExpense(null); setShowExpenseModal(true); }} />
            </div>

            <div className="bg-gray-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-md min-h-[600px] flex flex-col shadow-2xl">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 border-b border-white/5 pb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Activity className="text-blue-500" />
                        {t('finance.activityAndReports')}
                    </h2>
                    
                    <div className="w-full sm:w-auto flex bg-black/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md gap-1">
                        <TabButton label={t('finance.tabTransactions')} icon={<Activity size={16} />} isActive={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} />
                        <TabButton label={t('finance.tabReports')} icon={<BarChart2 size={16} />} isActive={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    {activeTab === 'transactions' && (
                        <div className="flex flex-col h-full space-y-6">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                                <input type="text" placeholder={t('header.searchPlaceholder')} className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-base text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-black/60 transition-all shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-finance-scroll pr-2 space-y-3">
                                {loading ? (
                                    <div className="flex justify-center h-48 items-center"><Loader2 className="w-12 h-12 animate-spin text-blue-500" /></div>
                                ) : (
                                    <TransactionList 
                                        allTransactions={allTransactions}
                                        openingDocId={openingDocId}
                                        onEditInvoice={handleEditInvoice}
                                        onEditExpense={handleEditExpense}
                                        onViewInvoice={handleViewInvoice}
                                        onViewExpense={handleViewExpense}
                                        onDownloadInvoice={handleDownloadInvoice}
                                        onDownloadExpense={handleDownloadExpense}
                                        onArchiveInvoice={handleArchiveInvoice}
                                        onArchiveExpense={handleArchiveExpense}
                                        onDeleteInvoice={handleDeleteInvoice}
                                        onDeleteExpense={handleDeleteExpense}
                                        onDeletePos={handleDeletePos}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="h-full overflow-y-auto custom-finance-scroll pr-2">
                            {!analyticsData ? <div className="text-center text-gray-500 py-10">{t('finance.reports.noData')}</div> : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-black/30 rounded-3xl p-6 border border-white/5 shadow-lg">
                                        <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-3"><TrendingUp size={24} className="text-blue-400" /> {t('finance.analytics.salesTrend')}</h4>
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={analyticsData.sales_trend}>
                                                    <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} tickFormatter={(str) => str.slice(5)} />
                                                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} itemStyle={{ color: '#fff' }} />
                                                    <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fill="url(#colorSales)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="bg-black/30 rounded-3xl p-6 border border-white/5 shadow-lg">
                                        <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-3"><BarChart2 size={24} className="text-emerald-400" /> {t('finance.analytics.topProducts')}</h4>
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={analyticsData.top_products} layout="vertical" margin={{ left: 20 }}>
                                                    <XAxis type="number" hide />
                                                    {/* PHOENIX: dataKey added to YAxis */}
                                                    <YAxis dataKey="product_name" type="category" width={100} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '16px' }} itemStyle={{ color: '#fff' }} />
                                                    <Bar dataKey="total_revenue" radius={[0, 8, 8, 0]} barSize={28}>
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

            <InvoiceModal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} invoiceToEdit={selectedInvoice} onSuccess={refreshData} />
            <ExpenseModal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} expenseToEdit={selectedExpense} onSuccess={refreshData} />
            
            {showArchiveInvoiceModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0f172a] border border-blue-500/20 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-blue-900/20">
                        <h2 className="text-xl font-bold text-white mb-4">{t('finance.archiveInvoice')}</h2>
                        <div className="mb-6"><label className="block text-sm text-gray-400 mb-1">{t('drafting.selectCaseLabel')}</label><select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none" value={selectedCaseForInvoice} onChange={(e) => setSelectedCaseForInvoice(e.target.value)}><option value="">{t('archive.generalNoCase')}</option>{cases.map(c => (<option key={c.id} value={c.id}>{c.title}</option>))}</select></div>
                        <div className="flex justify-end gap-3"><button onClick={() => setShowArchiveInvoiceModal(false)} className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors">{t('general.cancel')}</button><button onClick={submitArchiveInvoice} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white shadow-lg hover:bg-blue-500 transition-colors font-bold">{t('general.save')}</button></div>
                    </div>
                </div>
            )}
            
            {showArchiveExpenseModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0f172a] border border-blue-500/20 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-blue-900/20">
                        <h2 className="text-xl font-bold text-white mb-4">{t('finance.archiveExpenseTitle')}</h2>
                        <div className="mb-6"><label className="block text-sm text-gray-400 mb-1">{t('drafting.selectCaseLabel')}</label><select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none" value={selectedCaseForInvoice} onChange={(e) => setSelectedCaseForInvoice(e.target.value)}><option value="">{t('archive.generalNoCase')}</option>{cases.map(c => (<option key={c.id} value={c.id}>{c.title}</option>))}</select></div>
                        <div className="flex justify-end gap-3"><button onClick={() => setShowArchiveExpenseModal(false)} className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors">{t('general.cancel')}</button><button onClick={submitArchiveExpense} className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white shadow-lg hover:bg-indigo-500 transition-colors font-bold">{t('general.save')}</button></div>
                    </div>
                </div>
            )}
            
            {showImportModal && (<TransactionImporter onClose={() => setShowImportModal(false)} onSuccess={() => { refreshData(); setShowImportModal(false); }} t={t} />)}
            {viewingDoc && <PDFViewerModal documentData={viewingDoc} onClose={closePreview} onMinimize={closePreview} t={t} directUrl={viewingUrl} />}
        </motion.div>
    );
};