// FILE: src/components/business/finance/TransactionList.tsx
// FLAT LIST VERSION – no hierarchy, just a simple scrollable list

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart, Edit2, Eye, Download,
    Archive, Trash2, Loader2,
    Car, Utensils, Coffee, Building, Users, Landmark, Zap, Wifi, ArrowUpRight, ArrowDownRight,
    FileText
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

const safeDate = (dateStr: string): Date => {
    try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date() : d;
    } catch {
        return new Date();
    }
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
// Main TransactionList – Flat List
// -----------------------------------------------------------------------------

export const TransactionList: React.FC<TransactionListProps> = (props) => {
    const { allTransactions } = props;
    const { t } = useTranslation();

    // Optional: sort by date (newest first) using safeDate
    const sortedTransactions = useMemo(() => {
        return [...allTransactions].sort((a, b) => {
            const dateA = safeDate(a.date);
            const dateB = safeDate(b.date);
            return dateB.getTime() - dateA.getTime();
        });
    }, [allTransactions]);

    if (allTransactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-text-muted">
                <ShoppingCart size={48} className="mb-4 opacity-20" />
                <p>{t('finance.noTransactions')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <AnimatePresence>
                {sortedTransactions.map(tx => (
                    <TransactionCard key={tx.id} tx={tx} props={props} />
                ))}
            </AnimatePresence>
        </div>
    );
};