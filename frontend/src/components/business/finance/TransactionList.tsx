// FILE: src/components/business/finance/TransactionList.tsx
// FIXED: Card labels "Libri i shitjeve" and "Libri i blerjeve"

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart, Edit2, Eye, Download,
    Archive, Trash2, Loader2,
    Car, Utensils, Coffee, Building, Users, Landmark, Zap, Wifi, ArrowUpRight, ArrowDownRight,
    FileText, ArrowLeft, Hash, TrendingUp, TrendingDown, ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Invoice, Expense } from '../../../data/types';

export type TransactionItem = {
    id: string;
    type: 'invoice' | 'expense' | 'pos';
    date: string;
    amount: number;
    label: string;
    raw: any;
};

interface TransactionListProps {
    allTransactions: TransactionItem[];
    openingDocId: string | null;
    onEditInvoice: (inv: Invoice) => void;
    onEditExpense: (exp: Expense) => void;
    onViewInvoice: (inv: Invoice) => void;
    onViewExpense: (exp: Expense) => void;
    onDownloadInvoice: (id: string) => void;
    onDownloadExpense: (exp: Expense) => void;
    onArchiveInvoice: (id: string) => void;
    onArchiveExpense: (id: string) => void;
    onDeleteInvoice: (id: string) => void;
    onDeleteExpense: (id: string) => void;
    onDeletePos: (id: string) => void;
    onViewSourceDocument: (archiveId: string, title: string) => void;
    onBulkDelete: (ids: { invoice_ids: string[]; expense_ids: string[]; pos_ids: string[] }) => void;
    onExportExcel: (params: { year?: number; month?: number; day?: number; label: string }) => void;
}

// -----------------------------------------------------------------------------
// Helpers (unchanged)
// -----------------------------------------------------------------------------

const parseDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date() : date;
};

const getSortableDate = (dateStr: string): Date => {
    const date = parseDate(dateStr);
    return isNaN(date.getTime()) ? new Date(0) : date;
};

const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('transport') || cat.includes('naft') || cat.includes('vetur')) return <Car size={16} />;
    if (cat.includes('ushqim') || cat.includes('drek')) return <Utensils size={16} />;
    if (cat.includes('kafe')) return <Coffee size={16} />;
    if (cat.includes('zyr') || cat.includes('rent')) return <Building size={16} />;
    if (cat.includes('pag') || cat.includes('rrog')) return <Users size={16} />;
    if (cat.includes('tatim')) return <Landmark size={16} />;
    if (cat.includes('rrym')) return <Zap size={16} />;
    if (cat.includes('internet')) return <Wifi size={16} />;
    return <ArrowUpRight size={16} />;
};

const getTranslatedMonth = (dateObj: Date, lang: string, t: any) => {
    const monthIndex = dateObj.getMonth();
    const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const sqMonths = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];
    const monthKey = enMonths[monthIndex].toLowerCase();
    const fallback = lang.toLowerCase().startsWith('sq') ? sqMonths[monthIndex] : enMonths[monthIndex];
    return t(`months.${monthKey}`, fallback);
};

// -----------------------------------------------------------------------------
// TransactionCard Component (unchanged)
// -----------------------------------------------------------------------------

const TransactionCard: React.FC<{ tx: TransactionItem; props: TransactionListProps }> = ({ tx, props }) => {
    const hasSourceDocument = tx.type === 'expense' && (tx.raw as Expense).source_archive_id;
    const isIncome = tx.type === 'invoice';
    const isExpense = tx.type === 'expense';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className={`group flex items-center justify-between p-3 rounded-xl bg-surface/30 backdrop-blur-sm hover:bg-surface/50 transition-all duration-300 border border-border-main hover:border-l-4 shadow-sm hover-lift
                ${isIncome ? 'hover:border-l-success-start' : isExpense ? 'hover:border-l-danger-start' : 'hover:border-l-primary-start'}`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg shrink-0 ${tx.type === 'invoice' ? 'bg-success-start/10 text-success-start' : tx.type === 'expense' ? 'bg-danger-start/10 text-danger-start' : 'bg-primary-start/10 text-primary-start'}`}>
                    {tx.type === 'invoice' ? <ArrowDownRight size={16} /> : tx.type === 'pos' ? <ShoppingCart size={16} /> : getCategoryIcon(tx.label)}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{tx.label}</p>
                    <p className="text-xs font-black uppercase tracking-widest text-text-muted">{tx.type}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className={`font-mono text-sm font-bold ${tx.type === 'expense' ? 'text-danger-start' : 'text-success-start'}`}>
                    {tx.type === 'expense' ? '-' : '+'}€{tx.amount.toFixed(2)}
                </span>
                <div className="flex items-center gap-1 transition-opacity">
                    {hasSourceDocument && (
                        <button onClick={() => props.onViewSourceDocument((tx.raw as Expense).source_archive_id!, tx.label)} className="p-1.5 hover:bg-hover rounded-md text-primary-start hover-lift shadow-sm">
                            <FileText size={14} />
                        </button>
                    )}
                    {tx.type !== 'pos' ? (
                        <>
                            <button onClick={() => tx.type === 'invoice' ? props.onEditInvoice(tx.raw as Invoice) : props.onEditExpense(tx.raw as Expense)} className="p-1.5 hover:bg-hover rounded-md text-warning-start hover-lift shadow-sm">
                                <Edit2 size={14} />
                            </button>
                            <button onClick={() => tx.type === 'invoice' ? props.onViewInvoice(tx.raw as Invoice) : props.onViewExpense(tx.raw as Expense)} disabled={props.openingDocId === tx.id} className="p-1.5 hover:bg-hover rounded-md text-primary-start hover-lift shadow-sm">
                                {props.openingDocId === tx.id ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                            </button>
                            <button onClick={() => tx.type === 'invoice' ? props.onDownloadInvoice(tx.id) : props.onDownloadExpense(tx.raw as Expense)} className="p-1.5 hover:bg-hover rounded-md text-success-start hover-lift shadow-sm">
                                <Download size={14} />
                            </button>
                            <button onClick={() => tx.type === 'invoice' ? props.onArchiveInvoice(tx.id) : props.onArchiveExpense(tx.id)} className="p-1.5 hover:bg-hover rounded-md text-primary-start hover-lift shadow-sm">
                                <Archive size={14} />
                            </button>
                            <button onClick={() => tx.type === 'invoice' ? props.onDeleteInvoice(tx.id) : props.onDeleteExpense(tx.id)} className="p-1.5 hover:bg-hover rounded-md text-danger-start hover-lift shadow-sm">
                                <Trash2 size={14} />
                            </button>
                        </>
                    ) : (
                        <button onClick={() => props.onDeletePos(tx.id)} className="p-1.5 hover:bg-hover rounded-md text-danger-start hover-lift shadow-sm">
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// -----------------------------------------------------------------------------
// Drill‑Down Card Component (now with correct accounting labels)
// -----------------------------------------------------------------------------

const DrillDownCardWithDelete: React.FC<{
    title: string;
    total: number;
    count: number;
    isPurchaseBook: boolean;   // true = "Libri i blerjeve", false = "Libri i shitjeve"
    onDrillDown: () => void;
    onDelete: () => void;
    onExport: () => void;
}> = ({ title, total, count, isPurchaseBook, onDrillDown, onDelete, onExport }) => {
    const { t } = useTranslation();
    const cardLabel = isPurchaseBook
        ? (t('finance.purchasesBook', 'Libri i blerjeve'))
        : (t('finance.salesBook', 'Libri i shitjeve'));

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`group relative bg-surface/30 backdrop-blur-sm border-l-4 rounded-2xl p-5 transition-all duration-300 flex flex-col gap-4 shadow-sm hover:shadow-md cursor-pointer border border-border-main hover-lift
                ${!isPurchaseBook
                    ? 'border-l-success-start hover:border-l-success-start/70'
                    : 'border-l-danger-start hover:border-l-danger-start/70'
                }`}
            onClick={onDrillDown}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-text-primary">{title}</h3>
                    <ChevronRight className="text-text-muted group-hover:text-primary-start transition-colors" size={18} />
                </div>
                <div className={`p-3 rounded-xl ${!isPurchaseBook ? 'bg-success-start/10 text-success-start' : 'bg-danger-start/10 text-danger-start'}`}>
                    {!isPurchaseBook ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
            </div>
            <div className="flex-1 mt-2">
                <span className={`text-3xl font-mono font-bold ${!isPurchaseBook ? 'text-success-start' : 'text-danger-start'}`}>
                    {!isPurchaseBook ? '+' : ''}€{total.toFixed(2)}
                </span>
                <p className="text-xs font-black uppercase tracking-widest text-text-muted">{cardLabel}</p>
            </div>
            <hr className="border-border-main" />
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Hash size={14} />
                    <span className="font-bold">{count}</span> {t('finance.transactions', 'transaksione')}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onExport(); }}
                        className="p-2 rounded-lg text-text-muted bg-transparent hover:bg-primary-start/10 hover:text-primary-start transition-colors hover-lift shadow-sm"
                        title={t('finance.exportExcel', 'Eksporto në Excel')}
                    >
                        <Download size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-2 rounded-lg text-text-muted bg-transparent hover:bg-danger-start/10 hover:text-danger-start transition-colors hover-lift shadow-sm"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

// -----------------------------------------------------------------------------
// Main TransactionList Component with purchase/sales dominance logic
// -----------------------------------------------------------------------------

export const TransactionList: React.FC<TransactionListProps> = (props) => {
    const { allTransactions, onBulkDelete, onExportExcel } = props;
    const { t, i18n } = useTranslation();

    const [view, setView] = useState<'years' | 'months' | 'days' | 'transactions'>('years');
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    // Build hierarchy with month number
    const hierarchy = useMemo(() => {
        const tree: Record<string, Record<string, { monthNumber: number; days: Record<string, TransactionItem[]> }>> = {};

        allTransactions.forEach(tx => {
            const dateObj = parseDate(tx.date);
            const year = dateObj.getFullYear().toString();
            const monthName = getTranslatedMonth(dateObj, i18n.language, t);
            const monthNumber = dateObj.getMonth() + 1;
            const dayKey = dateObj.toISOString().slice(0, 10);

            if (!tree[year]) tree[year] = {};
            if (!tree[year][monthName]) tree[year][monthName] = { monthNumber, days: {} };
            if (!tree[year][monthName].days[dayKey]) tree[year][monthName].days[dayKey] = [];

            tree[year][monthName].days[dayKey].push(tx);
        });

        return tree;
    }, [allTransactions, i18n.language, t]);

    const handleBack = () => {
        if (view === 'transactions') setView('days');
        else if (view === 'days') setView('months');
        else if (view === 'months') setView('years');
    };

    const handleBreadcrumbClick = (targetView: 'years' | 'months' | 'days', year?: string, month?: string) => {
        if (targetView === 'years') {
            setView('years');
            setSelectedYear(null);
            setSelectedMonth(null);
            setSelectedDay(null);
        } else if (targetView === 'months' && year) {
            setView('months');
            setSelectedYear(year);
            setSelectedMonth(null);
            setSelectedDay(null);
        } else if (targetView === 'days' && year && month) {
            setView('days');
            setSelectedYear(year);
            setSelectedMonth(month);
            setSelectedDay(null);
        }
    };

    const handleBulkDelete = (transactions: TransactionItem[], scope: string) => {
        const idsToProcess = {
            invoice_ids: transactions.filter(tx => tx.type === 'invoice').map(tx => tx.id),
            expense_ids: transactions.filter(tx => tx.type === 'expense').map(tx => tx.id),
            pos_ids: transactions.filter(tx => tx.type === 'pos').map(tx => tx.id),
        };
        const totalCount = idsToProcess.invoice_ids.length + idsToProcess.expense_ids.length + idsToProcess.pos_ids.length;

        if (totalCount === 0) {
            alert(t('finance.bulkDelete.noItems', 'Nuk ka transaksione për t\'u fshirë në këtë periudhë.'));
            return;
        }
        if (window.confirm(t('finance.bulkDelete.confirm', `A jeni i sigurt që dëshironi të fshini të gjitha {{count}} transaksionet për '{{scope}}'? Ky veprim nuk mund të kthehet.`, { count: totalCount, scope }))) {
            onBulkDelete(idsToProcess);
        }
    };

    const renderBreadcrumb = () => {
        if (view === 'years') return null;
        const items = [];
        items.push({ label: t('general.years', 'Vitet'), onClick: () => handleBreadcrumbClick('years') });
        if (view === 'months' || view === 'days' || view === 'transactions') {
            items.push({ label: selectedYear!, onClick: () => handleBreadcrumbClick('months', selectedYear!) });
        }
        if (view === 'days' || view === 'transactions') {
            items.push({ label: selectedMonth!, onClick: () => handleBreadcrumbClick('days', selectedYear!, selectedMonth!) });
        }
        if (view === 'transactions') {
            items.push({ label: selectedDay! });
        }
        return (
            <div className="flex items-center gap-2 text-sm font-medium text-text-muted mb-4 flex-wrap">
                {items.map((item, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && <span>/</span>}
                        {item.onClick ? (
                            <button onClick={item.onClick} className="hover:text-primary-start transition-colors">
                                {item.label}
                            </button>
                        ) : (
                            <span className="text-text-primary font-bold">{item.label}</span>
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    };

    const renderContent = () => {
        switch (view) {
            case 'years':
                const yearData = Object.entries(hierarchy).map(([year, months]) => {
                    const allTxs = Object.values(months).flatMap(m => Object.values(m.days).flat());
                    const totalSales = allTxs.filter(tx => tx.type !== 'expense').reduce((acc, tx) => acc + tx.amount, 0);
                    const totalPurchases = allTxs.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + tx.amount, 0);
                    const netTotal = totalSales - totalPurchases;
                    const isPurchaseBook = totalPurchases > totalSales;
                    return {
                        year: parseInt(year),
                        netTotal,
                        isPurchaseBook,
                        txCount: allTxs.length,
                        allTxs,
                    };
                });
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {yearData.sort((a, b) => b.year - a.year).map(({ year, netTotal, isPurchaseBook, txCount, allTxs }) => (
                            <DrillDownCardWithDelete
                                key={year}
                                title={year.toString()}
                                total={netTotal}
                                count={txCount}
                                isPurchaseBook={isPurchaseBook}
                                onDrillDown={() => { setSelectedYear(year.toString()); setView('months'); }}
                                onDelete={() => handleBulkDelete(allTxs, year.toString())}
                                onExport={() => onExportExcel({ year, label: year.toString() })}
                            />
                        ))}
                    </div>
                );
            case 'months':
                if (!selectedYear || !hierarchy[selectedYear]) return null;
                const monthData = Object.entries(hierarchy[selectedYear]).map(([monthName, { monthNumber, days }]) => {
                    const allTxs = Object.values(days).flat();
                    const totalSales = allTxs.filter(tx => tx.type !== 'expense').reduce((acc, tx) => acc + tx.amount, 0);
                    const totalPurchases = allTxs.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + tx.amount, 0);
                    const netTotal = totalSales - totalPurchases;
                    const isPurchaseBook = totalPurchases > totalSales;
                    return {
                        monthName,
                        monthNumber,
                        netTotal,
                        isPurchaseBook,
                        txCount: allTxs.length,
                        allTxs,
                    };
                });
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {monthData.map(({ monthName, monthNumber, netTotal, isPurchaseBook, txCount, allTxs }) => (
                            <DrillDownCardWithDelete
                                key={monthName}
                                title={monthName}
                                total={netTotal}
                                count={txCount}
                                isPurchaseBook={isPurchaseBook}
                                onDrillDown={() => { setSelectedMonth(monthName); setView('days'); }}
                                onDelete={() => handleBulkDelete(allTxs, `${monthName} ${selectedYear}`)}
                                onExport={() => onExportExcel({ year: parseInt(selectedYear), month: monthNumber, label: `${monthName} ${selectedYear}` })}
                            />
                        ))}
                    </div>
                );
            case 'days':
                if (!selectedYear || !selectedMonth || !hierarchy[selectedYear]?.[selectedMonth]) return null;
                const dayData = Object.entries(hierarchy[selectedYear][selectedMonth].days).map(([dayKey, txs]) => {
                    const dateObj = parseDate(dayKey);
                    const displayDay = dateObj.toLocaleDateString(i18n.language, { year: 'numeric', month: '2-digit', day: '2-digit' });
                    const totalSales = txs.filter(tx => tx.type !== 'expense').reduce((acc, tx) => acc + tx.amount, 0);
                    const totalPurchases = txs.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + tx.amount, 0);
                    const netTotal = totalSales - totalPurchases;
                    const isPurchaseBook = totalPurchases > totalSales;
                    return {
                        day: displayDay,
                        dayKey,
                        netTotal,
                        isPurchaseBook,
                        txCount: txs.length,
                        allTxs: txs,
                    };
                });
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {dayData.sort((a, b) => getSortableDate(b.dayKey).getTime() - getSortableDate(a.dayKey).getTime()).map(({ day, dayKey, netTotal, isPurchaseBook, txCount, allTxs }) => {
                            const dateObj = parseDate(dayKey);
                            return (
                                <DrillDownCardWithDelete
                                    key={dayKey}
                                    title={day}
                                    total={netTotal}
                                    count={txCount}
                                    isPurchaseBook={isPurchaseBook}
                                    onDrillDown={() => { setSelectedDay(dayKey); setView('transactions'); }}
                                    onDelete={() => handleBulkDelete(allTxs, day)}
                                    onExport={() => onExportExcel({
                                        year: dateObj.getFullYear(),
                                        month: dateObj.getMonth() + 1,
                                        day: dateObj.getDate(),
                                        label: day
                                    })}
                                />
                            );
                        })}
                    </div>
                );
            case 'transactions':
                if (!selectedYear || !selectedMonth || !selectedDay || !hierarchy[selectedYear]?.[selectedMonth]?.days[selectedDay]) return null;
                const transactions = hierarchy[selectedYear][selectedMonth].days[selectedDay];
                return (
                    <div className="space-y-2">
                        {transactions.map(tx => <TransactionCard key={tx.id} tx={tx} props={props} />)}
                    </div>
                );
            default:
                return null;
        }
    };

    if (allTransactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-text-muted">
                <ShoppingCart size={48} className="mb-4 opacity-20" />
                <p>{t('finance.noTransactions')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                {renderBreadcrumb()}
                {view !== 'years' && (
                    <button onClick={handleBack} className="flex items-center gap-1 text-sm font-bold text-text-muted hover:text-text-primary transition-colors group hover-lift shadow-sm px-3 py-1.5 rounded-lg bg-surface/30 border border-border-main">
                        <ArrowLeft size={14} />
                        <span>{t('general.back', 'Kthehu')}</span>
                    </button>
                )}
            </div>
            <AnimatePresence mode="wait">
                <motion.div key={view} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
                    {renderContent()}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};