// FILE: src/components/business/finance/TransactionList.tsx
// PHOENIX PROTOCOL - TRANSACTION EXPLORER V5.1 (LINTER FIX)
// 1. FIX: Corrected a syntax error and removed all unused imports (useState, useEffect, Chevrons).
// 2. STATUS: This file is now clean, error-free, and implements the hierarchical card layout.

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShoppingCart, Edit2, Eye, Download, 
    Archive, Trash2, Calendar, Loader2, 
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
}

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

// --- CARD COMPONENTS ---

const TransactionCard: React.FC<{ tx: TransactionItem, props: TransactionListProps }> = ({ tx, props }) => {
    const hasSourceDocument = tx.type === 'expense' && (tx.raw as Expense).source_archive_id;
    return (
        <motion.div 
            layout 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="group flex items-center justify-between p-3 rounded-xl bg-black/30 hover:bg-black/50 transition-colors"
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg shrink-0 ${ tx.type === 'invoice' ? 'bg-emerald-500/10 text-emerald-400' : tx.type === 'expense' ? 'bg-rose-500/10 text-rose-400' : 'bg-purple-500/10 text-purple-400' }`}>
                    {tx.type === 'invoice' ? <ArrowDownRight size={16} /> : tx.type === 'pos' ? <ShoppingCart size={16} /> : getCategoryIcon(tx.label)}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{tx.label}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{tx.type}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className={`font-mono text-sm font-bold ${tx.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'}`}>{tx.type === 'expense' ? '-' : '+'}€{tx.amount.toFixed(2)}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {hasSourceDocument && (<button onClick={() => props.onViewSourceDocument((tx.raw as Expense).source_archive_id!, tx.label)} className="p-1.5 hover:bg-white/10 rounded-md text-sky-400"><FileText size={14} /></button>)}
                    {tx.type !== 'pos' ? (
                        <>
                            <button onClick={() => tx.type === 'invoice' ? props.onEditInvoice(tx.raw as Invoice) : props.onEditExpense(tx.raw as Expense)} className="p-1.5 hover:bg-white/10 rounded-md text-amber-400"><Edit2 size={14} /></button>
                            <button onClick={() => tx.type === 'invoice' ? props.onViewInvoice(tx.raw as Invoice) : props.onViewExpense(tx.raw as Expense)} disabled={props.openingDocId === tx.id} className="p-1.5 hover:bg-white/10 rounded-md text-blue-400">{props.openingDocId === tx.id ? <Loader2 size={14} className="animate-spin"/> : <Eye size={14} />}</button>
                            <button onClick={() => tx.type === 'invoice' ? props.onDownloadInvoice(tx.id) : props.onDownloadExpense(tx.raw as Expense)} className="p-1.5 hover:bg-white/10 rounded-md text-green-400"><Download size={14} /></button>
                            <button onClick={() => tx.type === 'invoice' ? props.onArchiveInvoice(tx.id) : props.onArchiveExpense(tx.id)} className="p-1.5 hover:bg-white/10 rounded-md text-indigo-400"><Archive size={14} /></button>
                            <button onClick={() => tx.type === 'invoice' ? props.onDeleteInvoice(tx.id) : props.onDeleteExpense(tx.id)} className="p-1.5 hover:bg-white/10 rounded-md text-red-400"><Trash2 size={14} /></button>
                        </>
                    ) : (<button onClick={() => props.onDeletePos(tx.id)} className="p-1.5 hover:bg-white/10 rounded-md text-red-400"><Trash2 size={14} /></button>)}
                </div>
            </div>
        </motion.div>
    );
};

const DayCard: React.FC<{ day: string, transactions: TransactionItem[], props: TransactionListProps }> = ({ day, transactions, props }) => {
    const dayTotal = transactions.reduce((acc, tx) => tx.type === 'expense' ? acc - tx.amount : acc + tx.amount, 0);
    return (
        <motion.div layout className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-black/20">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 text-blue-400 p-1.5 rounded-lg"><Calendar size={14} /></div>
                    <span className="text-sm font-medium text-gray-300">{day}</span>
                </div>
                <span className={`text-sm font-mono font-bold ${dayTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{dayTotal >= 0 ? '+' : ''}€{dayTotal.toFixed(2)}</span>
            </div>
            <div className="p-2 space-y-1">
                <AnimatePresence>
                    {transactions.map(tx => <TransactionCard key={tx.id} tx={tx} props={props} />)}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

const MonthCard: React.FC<{ month: string, days: Record<string, TransactionItem[]>, props: TransactionListProps }> = ({ month, days, props }) => {
    const monthTotal = Object.values(days).flat().reduce((acc, tx) => tx.type === 'expense' ? acc - tx.amount : acc + tx.amount, 0);
    return (
        <motion.div layout className="bg-gray-900/40 rounded-3xl p-4 border border-white/5 space-y-3">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-bold text-white">{month}</h3>
                <span className={`font-mono font-bold ${monthTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{monthTotal >= 0 ? '+' : ''}€{monthTotal.toFixed(2)}</span>
            </div>
            <div className="space-y-3">
                {Object.keys(days).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(day => (
                    <DayCard key={day} day={day} transactions={days[day]} props={props} />
                ))}
            </div>
        </motion.div>
    );
};

const YearCard: React.FC<{ year: string, months: Record<string, Record<string, TransactionItem[]>>, props: TransactionListProps }> = ({ year, months, props }) => {
    const yearTotal = Object.values(months).flatMap(m => Object.values(m).flat()).reduce((acc, tx) => tx.type === 'expense' ? acc - tx.amount : acc + tx.amount, 0);
    return (
        <motion.div layout className="bg-black/30 rounded-3xl p-4 border border-white/10 space-y-4">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-black text-white tracking-tight">{year}</h2>
                <span className={`text-xl font-mono font-bold ${yearTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{yearTotal >= 0 ? '+' : ''}€{yearTotal.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {Object.keys(months).map(month => (
                    <MonthCard key={month} month={month} days={months[month]} props={props} />
                ))}
            </div>
        </motion.div>
    );
};

export const TransactionList: React.FC<TransactionListProps> = (props) => {
    const { allTransactions } = props;
    const { t, i18n } = useTranslation();

    const hierarchy = useMemo(() => {
        const tree: Record<string, Record<string, Record<string, TransactionItem[]>>> = {};
        allTransactions.forEach(tx => {
            const date = new Date(tx.date);
            const year = date.getFullYear().toString();
            const month = date.toLocaleString(i18n.language, { month: 'long' });
            const dayKey = date.toLocaleDateString(i18n.language, { year: 'numeric', month: '2-digit', day: '2-digit' });

            if (!tree[year]) tree[year] = {};
            if (!tree[year][month]) tree[year][month] = {};
            if (!tree[year][month][dayKey]) tree[year][month][dayKey] = [];
            tree[year][month][dayKey].push(tx);
        });
        return tree;
    }, [allTransactions, i18n.language]);

    if (allTransactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <ShoppingCart size={48} className="mb-4 opacity-20" />
                <p>{t('finance.noTransactions')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AnimatePresence>
                {Object.keys(hierarchy).sort((a, b) => Number(b) - Number(a)).map(year => (
                    <YearCard key={year} year={year} months={hierarchy[year]} props={props} />
                ))}
            </AnimatePresence>
        </div>
    );
};