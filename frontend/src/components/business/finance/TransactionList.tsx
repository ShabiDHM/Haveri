// FILE: src/components/business/finance/TransactionList.tsx
// PHOENIX PROTOCOL - IMPORT FIX V7.2
// 1. CRITICAL FIX: Added 'TrendingUp' and 'TrendingDown' to lucide-react import to fix compilation errors.
// 2. LINT FIX: Removed unused 'ArrowRight' import.

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShoppingCart, Edit2, Eye, Download, 
    Archive, Trash2, Loader2, 
    Car, Utensils, Coffee, Building, Users, Landmark, Zap, Wifi, ArrowUpRight, ArrowDownRight,
    FileText, ArrowLeft, Hash, TrendingUp, TrendingDown // PHOENIX: Corrected Imports
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Invoice, Expense } from '../../../data/types';

export type TransactionItem = { id: string; type: 'invoice' | 'expense' | 'pos'; date: string; amount: number; label: string; raw: any; };

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
    onBulkDeletePos: (transactionIds: string[]) => void;
}

const getCategoryIcon = (category: string) => { const cat = category.toLowerCase(); if (cat.includes('transport') || cat.includes('naft') || cat.includes('vetur')) return <Car size={16} />; if (cat.includes('ushqim') || cat.includes('drek')) return <Utensils size={16} />; if (cat.includes('kafe')) return <Coffee size={16} />; if (cat.includes('zyr') || cat.includes('rent')) return <Building size={16} />; if (cat.includes('pag') || cat.includes('rrog')) return <Users size={16} />; if (cat.includes('tatim')) return <Landmark size={16} />; if (cat.includes('rrym')) return <Zap size={16} />; if (cat.includes('internet')) return <Wifi size={16} />; return <ArrowUpRight size={16} />; };

// --- CARD COMPONENTS ---

const TransactionCard: React.FC<{ tx: TransactionItem, props: TransactionListProps }> = ({ tx, props }) => {
    const hasSourceDocument = tx.type === 'expense' && (tx.raw as Expense).source_archive_id;
    return (
        <motion.div layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="group flex items-center justify-between p-3 rounded-xl bg-black/40 hover:bg-black/60 transition-colors">
            <div className="flex items-center gap-3 min-w-0"><div className={`p-2 rounded-lg shrink-0 ${ tx.type === 'invoice' ? 'bg-emerald-500/10 text-emerald-400' : tx.type === 'expense' ? 'bg-rose-500/10 text-rose-400' : 'bg-purple-500/10 text-purple-400' }`}>{tx.type === 'invoice' ? <ArrowDownRight size={16} /> : tx.type === 'pos' ? <ShoppingCart size={16} /> : getCategoryIcon(tx.label)}</div><div className="min-w-0"><p className="text-sm font-medium text-white truncate">{tx.label}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider">{tx.type}</p></div></div>
            <div className="flex items-center gap-4"><span className={`font-mono text-sm font-bold ${tx.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'}`}>{tx.type === 'expense' ? '-' : '+'}€{tx.amount.toFixed(2)}</span><div className="flex items-center gap-1 transition-opacity">{hasSourceDocument && (<button onClick={() => props.onViewSourceDocument((tx.raw as Expense).source_archive_id!, tx.label)} className="p-1.5 hover:bg-white/10 rounded-md text-sky-400"><FileText size={14} /></button>)}{tx.type !== 'pos' ? (<><button onClick={() => tx.type === 'invoice' ? props.onEditInvoice(tx.raw as Invoice) : props.onEditExpense(tx.raw as Expense)} className="p-1.5 hover:bg-white/10 rounded-md text-amber-400"><Edit2 size={14} /></button><button onClick={() => tx.type === 'invoice' ? props.onViewInvoice(tx.raw as Invoice) : props.onViewExpense(tx.raw as Expense)} disabled={props.openingDocId === tx.id} className="p-1.5 hover:bg-white/10 rounded-md text-blue-400">{props.openingDocId === tx.id ? <Loader2 size={14} className="animate-spin"/> : <Eye size={14} />}</button><button onClick={() => tx.type === 'invoice' ? props.onDownloadInvoice(tx.id) : props.onDownloadExpense(tx.raw as Expense)} className="p-1.5 hover:bg-white/10 rounded-md text-green-400"><Download size={14} /></button><button onClick={() => tx.type === 'invoice' ? props.onArchiveInvoice(tx.id) : props.onArchiveExpense(tx.id)} className="p-1.5 hover:bg-white/10 rounded-md text-indigo-400"><Archive size={14} /></button><button onClick={() => tx.type === 'invoice' ? props.onDeleteInvoice(tx.id) : props.onDeleteExpense(tx.id)} className="p-1.5 hover:bg-white/10 rounded-md text-red-400"><Trash2 size={14} /></button></>) : (<button onClick={() => props.onDeletePos(tx.id)} className="p-1.5 hover:bg-white/10 rounded-md text-red-400"><Trash2 size={14} /></button>)}</div></div>
        </motion.div>
    );
};

const DrillDownCardWithDelete: React.FC<{ title: string, total: number, count: number, onDrillDown: () => void, onDelete: () => void }> = ({ title, total, count, onDrillDown, onDelete }) => {
    const { t } = useTranslation();
    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="group relative bg-gray-900/60 hover:bg-gray-800/80 border border-white/10 hover:border-blue-500/30 p-5 rounded-3xl transition-all duration-300 flex flex-col gap-4">
            <div onClick={onDrillDown} className="cursor-pointer flex-1 flex flex-col">
                <div className="flex items-start justify-between">
                    <h3 className="text-2xl font-bold text-white">{title}</h3>
                    <div className={`p-3 rounded-xl ${total >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {total >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    </div>
                </div>
                <div className="flex-1 mt-2">
                    <span className={`text-3xl font-mono font-bold ${total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{total >= 0 ? '+' : ''}€{total.toFixed(2)}</span>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('finance.netBalance', 'Balansi Neto')}</p>
                </div>
            </div>

            <hr className="border-white/10" />

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Hash size={14}/>
                    <span className="font-bold">{count}</span> {t('finance.transactions', 'transaksione')}
                </div>
                <button onClick={onDelete} className="p-2 rounded-lg text-gray-500 bg-transparent hover:bg-red-500/10 hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                </button>
            </div>
        </motion.div>
    );
};


export const TransactionList: React.FC<TransactionListProps> = (props) => {
    const { allTransactions, onBulkDeletePos } = props;
    const { t, i18n } = useTranslation();

    const [view, setView] = useState<'years' | 'months' | 'days' | 'transactions'>('years');
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

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

    const handleBack = () => {
        if (view === 'transactions') setView('days');
        else if (view === 'days') setView('months');
        else if (view === 'months') setView('years');
    };

    const handleBulkDelete = (ids: string[], scope: string) => {
        const posIds = ids; 
        if(posIds.length === 0) {
            alert(t('finance.bulkDelete.noPosItems', 'No POS transactions to delete in this period.'));
            return;
        }
        if (window.confirm(t('finance.bulkDelete.confirm', `Are you sure you want to delete all {{count}} transactions for '{{scope}}'? This cannot be undone.`, { count: posIds.length, scope }))) {
            onBulkDeletePos(posIds);
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
                        txIds: allTxs.filter(tx => tx.type === 'pos').map(tx => tx.id)
                    };
                });
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {yearData.sort((a,b) => parseInt(b.year) - parseInt(a.year)).map(({ year, total, txCount, txIds }) => (
                            <DrillDownCardWithDelete key={year} title={year} total={total} count={txCount} onDrillDown={() => { setSelectedYear(year); setView('months'); }} onDelete={() => handleBulkDelete(txIds, year)} />
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
                        txIds: allTxs.filter(tx => tx.type === 'pos').map(tx => tx.id)
                    };
                });
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {monthData.map(({ month, total, txCount, txIds }) => (
                            <DrillDownCardWithDelete key={month} title={month} total={total} count={txCount} onDrillDown={() => { setSelectedMonth(month); setView('days'); }} onDelete={() => handleBulkDelete(txIds, `${month} ${selectedYear}`)} />
                        ))}
                    </div>
                );
            case 'days':
                if (!selectedYear || !selectedMonth || !hierarchy[selectedYear]?.[selectedMonth]) return null;
                const dayData = Object.entries(hierarchy[selectedYear][selectedMonth]).map(([day, txs]) => ({
                    day,
                    total: txs.reduce((acc, tx) => tx.type === 'expense' ? acc - tx.amount : acc + tx.amount, 0),
                    txCount: txs.length,
                    txIds: txs.filter(tx => tx.type === 'pos').map(tx => tx.id)
                }));
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                         {dayData.sort((a,b) => new Date(b.day).getTime() - new Date(a.day).getTime()).map(({ day, total, txCount, txIds }) => (
                            <DrillDownCardWithDelete key={day} title={day} total={total} count={txCount} onDrillDown={() => { setSelectedDay(day); setView('transactions'); }} onDelete={() => handleBulkDelete(txIds, day)} />
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
        }
    };

    if (allTransactions.length === 0) {
        return <div className="flex flex-col items-center justify-center h-64 text-gray-500"><ShoppingCart size={48} className="mb-4 opacity-20" /><p>{t('finance.noTransactions')}</p></div>;
    }

    return (
        <div className="space-y-4">
            <AnimatePresence>
                {view !== 'years' && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                        <button onClick={handleBack} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors group">
                            <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10"><ArrowLeft size={16}/></div>
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