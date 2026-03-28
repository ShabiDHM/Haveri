// FILE: src/components/business/finance/TransactionList.tsx
// FIXED: Safe date parsing, hierarchical drill‑down restored, no unused imports

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart, Edit2, Eye, Download,
    Archive, Trash2, Loader2,
    Car, Utensils, Coffee, Building, Users, Landmark, Zap, Wifi, ArrowUpRight, ArrowDownRight,
    FileText, ArrowLeft, Hash, TrendingUp, TrendingDown
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
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const safeParseDate = (dateStr: string): Date | null => {
    try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
    } catch {
        return null;
    }
};

// Returns a valid Date for sorting (invalid dates become the epoch)
const getSortableDate = (dateStr: string): Date => {
    const parsed = safeParseDate(dateStr);
    return parsed ?? new Date(0);
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
// Drill‑Down Card Component (unchanged)
// -----------------------------------------------------------------------------

const DrillDownCardWithDelete: React.FC<{
    title: string;
    total: number;
    count: number;
    onDrillDown: () => void;
    onDelete: () => void;
}> = ({ title, total, count, onDrillDown, onDelete }) => {
    const { t } = useTranslation();
    const isPositive = total >= 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`group relative bg-surface/30 backdrop-blur-sm border-l-4 rounded-2xl p-5 transition-all duration-300 flex flex-col gap-4 shadow-sm hover:shadow-md cursor-pointer border border-border-main hover-lift
                ${isPositive
                    ? 'border-l-success-start hover:border-l-success-start/70'
                    : 'border-l-danger-start hover:border-l-danger-start/70'
                }`}
            onClick={onDrillDown}
        >
            <div className="flex items-start justify-between">
                <h3 className="text-2xl font-bold text-text-primary">{title}</h3>
                <div className={`p-3 rounded-xl ${isPositive ? 'bg-success-start/10 text-success-start' : 'bg-danger-start/10 text-danger-start'}`}>
                    {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
            </div>
            <div className="flex-1 mt-2">
                <span className={`text-3xl font-mono font-bold ${isPositive ? 'text-success-start' : 'text-danger-start'}`}>
                    {isPositive ? '+' : ''}€{total.toFixed(2)}
                </span>
                <p className="text-xs font-black uppercase tracking-widest text-text-muted">{t('finance.netBalance', 'Balansi Neto')}</p>
            </div>
            <hr className="border-border-main" />
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Hash size={14} />
                    <span className="font-bold">{count}</span> {t('finance.transactions', 'transaksione')}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-2 rounded-lg text-text-muted bg-transparent hover:bg-danger-start/10 hover:text-danger-start transition-colors hover-lift shadow-sm"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </motion.div>
    );
};

// -----------------------------------------------------------------------------
// Main TransactionList Component – Hierarchical Drill‑Down with Safe Dates
// -----------------------------------------------------------------------------

export const TransactionList: React.FC<TransactionListProps> = (props) => {
    const { allTransactions, onBulkDelete } = props;
    const { t, i18n } = useTranslation();

    const [view, setView] = useState<'years' | 'months' | 'days' | 'transactions'>('years');
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    // Build hierarchy with safe date parsing
    const hierarchy = useMemo(() => {
        const tree: Record<string, Record<string, Record<string, TransactionItem[]>>> = {};

        allTransactions.forEach(tx => {
            const dateObj = safeParseDate(tx.date);
            if (!dateObj) {
                // Skip invalid dates (or you could put them in a special bucket)
                console.warn(`Invalid date for transaction ${tx.id}: ${tx.date}`);
                return;
            }

            const year = dateObj.getFullYear().toString();
            const month = dateObj.toLocaleString(i18n.language, { month: 'long' });
            // Use a sortable day key (ISO date) to preserve order
            const dayKey = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD

            if (!tree[year]) tree[year] = {};
            if (!tree[year][month]) tree[year][month] = {};
            if (!tree[year][month][dayKey]) tree[year][month][dayKey] = [];

            tree[year][month][dayKey].push(tx);
        });

        return tree;
    }, [allTransactions, i18n.language]);

    const handleBack = () => {
        if (view === 'transactions') setView('days');
        else if (view === 'days') setView('months');
        else if (view === 'months') setView('years');
    };

    const handleBulkDelete = (transactions: TransactionItem[], scope: string) => {
        const idsToProcess = {
            invoice_ids: transactions.filter(tx => tx.type === 'invoice').map(tx => tx.id),
            expense_ids: transactions.filter(tx => tx.type === 'expense').map(tx => tx.id),
            pos_ids: transactions.filter(tx => tx.type === 'pos').map(tx => tx.id),
        };
        const totalCount = idsToProcess.invoice_ids.length + idsToProcess.expense_ids.length + idsToProcess.pos_ids.length;

        if (totalCount === 0) {
            alert(t('finance.bulkDelete.noItems', 'No transactions to delete in this period.'));
            return;
        }
        if (window.confirm(t('finance.bulkDelete.confirm', `Are you sure you want to delete all {{count}} transactions for '{{scope}}'? This cannot be undone.`, { count: totalCount, scope }))) {
            onBulkDelete(idsToProcess);
        }
    };

    const renderContent = () => {
        switch (view) {
            case 'years':
                const yearData = Object.entries(hierarchy).map(([year, months]) => {
                    const allTxs = Object.values(months).flatMap(m => Object.values(m).flat());
                    return {
                        year,
                        total: allTxs.reduce((acc, tx) => tx.type === 'expense' ? acc - tx.amount : acc + tx.amount, 0),
                        txCount: allTxs.length,
                        allTxs,
                    };
                });
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {yearData.sort((a, b) => parseInt(b.year) - parseInt(a.year)).map(({ year, total, txCount, allTxs }) => (
                            <DrillDownCardWithDelete
                                key={year}
                                title={year}
                                total={total}
                                count={txCount}
                                onDrillDown={() => { setSelectedYear(year); setView('months'); }}
                                onDelete={() => handleBulkDelete(allTxs, year)}
                            />
                        ))}
                    </div>
                );
            case 'months':
                if (!selectedYear || !hierarchy[selectedYear]) return null;
                const monthData = Object.entries(hierarchy[selectedYear]).map(([month, days]) => {
                    const allTxs = Object.values(days).flat();
                    return {
                        month,
                        total: allTxs.reduce((acc, tx) => tx.type === 'expense' ? acc - tx.amount : acc + tx.amount, 0),
                        txCount: allTxs.length,
                        allTxs,
                    };
                });
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {monthData.map(({ month, total, txCount, allTxs }) => (
                            <DrillDownCardWithDelete
                                key={month}
                                title={month}
                                total={total}
                                count={txCount}
                                onDrillDown={() => { setSelectedMonth(month); setView('days'); }}
                                onDelete={() => handleBulkDelete(allTxs, `${month} ${selectedYear}`)}
                            />
                        ))}
                    </div>
                );
            case 'days':
                if (!selectedYear || !selectedMonth || !hierarchy[selectedYear]?.[selectedMonth]) return null;
                const dayData = Object.entries(hierarchy[selectedYear][selectedMonth]).map(([dayKey, txs]) => {
                    // Format dayKey (YYYY-MM-DD) into a readable date string
                    const dateObj = safeParseDate(dayKey);
                    const displayDay = dateObj
                        ? dateObj.toLocaleDateString(i18n.language, { year: 'numeric', month: '2-digit', day: '2-digit' })
                        : dayKey;
                    return {
                        day: displayDay,
                        dayKey,
                        total: txs.reduce((acc, tx) => tx.type === 'expense' ? acc - tx.amount : acc + tx.amount, 0),
                        txCount: txs.length,
                        allTxs: txs,
                    };
                });
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {dayData.sort((a, b) => getSortableDate(b.dayKey).getTime() - getSortableDate(a.dayKey).getTime()).map(({ day, dayKey, total, txCount, allTxs }) => (
                            <DrillDownCardWithDelete
                                key={dayKey}
                                title={day}
                                total={total}
                                count={txCount}
                                onDrillDown={() => { setSelectedDay(dayKey); setView('transactions'); }}
                                onDelete={() => handleBulkDelete(allTxs, day)}
                            />
                        ))}
                    </div>
                );
            case 'transactions':
                if (!selectedYear || !selectedMonth || !selectedDay || !hierarchy[selectedYear]?.[selectedMonth]?.[selectedDay]) return null;
                const transactions = hierarchy[selectedYear][selectedMonth][selectedDay];
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
            <AnimatePresence>
                {view !== 'years' && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                        <button onClick={handleBack} className="flex items-center gap-2 text-sm font-bold text-text-muted hover:text-text-primary transition-colors group hover-lift shadow-sm">
                            <div className="p-2 rounded-full bg-surface/50 backdrop-blur-sm group-hover:bg-hover border border-border-main"><ArrowLeft size={16} /></div>
                            <span>
                                {view === 'months' && t('general.backToYears', 'Back to Years')}
                                {view === 'days' && `${t('general.backTo', 'Back to')} ${selectedYear}`}
                                {view === 'transactions' && `${t('general.backTo', 'Back to')} ${selectedMonth}`}
                            </span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence mode="wait">
                <motion.div key={view} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
                    {renderContent()}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};