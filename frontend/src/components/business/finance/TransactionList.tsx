// FILE: src/components/business/finance/TransactionList.tsx
// PHOENIX PROTOCOL - TRANSACTION EXPLORER V4.0 (FULL RESTORATION)
// 1. RESTORATION: This is a complete, line-by-line restoration of all original logic, state, and JSX.
// 2. INTEGRATION: The 'onViewSourceDocument' feature is correctly integrated without removing any existing code.
// 3. VERIFICATION: All 'unused variable' and 'cannot find name' errors are resolved.

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShoppingCart, Edit2, Eye, Download, 
    Archive, Trash2, ChevronDown, ChevronRight, Calendar, Loader2, 
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

export const TransactionList: React.FC<TransactionListProps> = ({
    allTransactions, openingDocId,
    onEditInvoice, onEditExpense, onViewInvoice, onViewExpense,
    onDownloadInvoice, onDownloadExpense, onArchiveInvoice, onArchiveExpense,
    onDeleteInvoice, onDeleteExpense, onDeletePos, onViewSourceDocument
}) => {
    const { t, i18n } = useTranslation();
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

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

    useEffect(() => {
        const now = new Date();
        const currentYear = now.getFullYear().toString();
        const currentMonth = now.toLocaleString(i18n.language, { month: 'long' });
        
        const initialNodes = new Set<string>();
        if (hierarchy[currentYear]) {
            initialNodes.add(`year-${currentYear}`);
            if (hierarchy[currentYear][currentMonth]) {
                initialNodes.add(`month-${currentYear}-${currentMonth}`);
            }
        }
        setExpandedNodes(initialNodes);
    }, [hierarchy, i18n.language]);

    const toggleNode = (nodeKey: string) => {
        const newSet = new Set(expandedNodes);
        if (newSet.has(nodeKey)) newSet.delete(nodeKey);
        else newSet.add(nodeKey);
        setExpandedNodes(newSet);
    };

    const calculateTotal = (items: TransactionItem[]) => {
        return items.reduce((acc, tx) => {
            if (tx.type === 'expense') return acc - tx.amount;
            return acc + tx.amount;
        }, 0);
    };

    if (allTransactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <ShoppingCart size={48} className="mb-4 opacity-20" />
                <p>{t('finance.noTransactions')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {Object.keys(hierarchy).sort((a, b) => Number(b) - Number(a)).map(year => {
                const yearTotal = Object.values(hierarchy[year]).flatMap(m => Object.values(m).flat()).reduce((acc, tx) => tx.type === 'expense' ? acc - tx.amount : acc + tx.amount, 0);
                const isYearExpanded = expandedNodes.has(`year-${year}`);

                return (
                    <div key={year} className="border border-white/10 rounded-2xl overflow-hidden bg-black/20">
                        <div onClick={() => toggleNode(`year-${year}`)} className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`p-1 rounded-lg transition-transform duration-200 ${isYearExpanded ? 'rotate-90' : ''}`}>
                                    <ChevronRight size={20} className="text-gray-400" />
                                </div>
                                <span className="text-xl font-bold text-white">{year}</span>
                            </div>
                            <span className={`font-mono font-bold ${yearTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{yearTotal >= 0 ? '+' : ''}€{yearTotal.toFixed(2)}</span>
                        </div>

                        <AnimatePresence>
                            {isYearExpanded && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="border-t border-white/5">
                                    {Object.keys(hierarchy[year]).map(month => {
                                        const monthData = hierarchy[year][month];
                                        const monthTotal = Object.values(monthData).flat().reduce((acc, tx) => tx.type === 'expense' ? acc - tx.amount : acc + tx.amount, 0);
                                        const isMonthExpanded = expandedNodes.has(`month-${year}-${month}`);

                                        return (
                                            <div key={month} className="border-l-2 border-white/5 ml-4 my-1">
                                                <div onClick={() => toggleNode(`month-${year}-${month}`)} className="flex items-center justify-between p-3 pl-4 cursor-pointer hover:bg-white/5 transition-colors rounded-r-xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`transition-transform duration-200 ${isMonthExpanded ? 'rotate-90' : ''}`}><ChevronRight size={16} className="text-gray-500" /></div>
                                                        <span className="text-base font-medium text-gray-200">{month}</span>
                                                    </div>
                                                    <span className={`text-sm font-mono ${monthTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{monthTotal >= 0 ? '+' : ''}€{monthTotal.toFixed(2)}</span>
                                                </div>

                                                <AnimatePresence>
                                                    {isMonthExpanded && (
                                                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="ml-6 space-y-2 py-2">
                                                            {Object.keys(monthData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(day => {
                                                                const dayTransactions = monthData[day];
                                                                const dayTotal = calculateTotal(dayTransactions);
                                                                const isDayExpanded = expandedNodes.has(`day-${day}`);

                                                                return (
                                                                    <div key={day} className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                                                                        <div onClick={() => toggleNode(`day-${day}`)} className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/10 transition-colors">
                                                                            <div className="flex items-center gap-3">
                                                                                 <div className="bg-blue-500/20 text-blue-400 p-1.5 rounded-lg"><Calendar size={14} /></div>
                                                                                 <span className="text-sm font-medium text-gray-300">{day}</span>
                                                                                 <span className="text-xs text-gray-500 bg-black/30 px-2 py-0.5 rounded-full">{dayTransactions.length} Transaksione</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-3">
                                                                                <span className={`text-sm font-mono font-bold ${dayTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{dayTotal >= 0 ? '+' : ''}€{dayTotal.toFixed(2)}</span>
                                                                                {isDayExpanded ? <ChevronDown size={16} className="text-gray-500"/> : <ChevronRight size={16} className="text-gray-500"/>}
                                                                            </div>
                                                                        </div>

                                                                        <AnimatePresence>
                                                                            {isDayExpanded && (
                                                                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-black/20 border-t border-white/5">
                                                                                    {dayTransactions.map(tx => {
                                                                                        const hasSourceDocument = tx.type === 'expense' && (tx.raw as Expense).source_archive_id;
                                                                                        return (
                                                                                            <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors pl-4 sm:pl-12">
                                                                                                <div className="flex items-center gap-3 min-w-0 mb-2 sm:mb-0">
                                                                                                    <div className={`p-2 rounded-lg shrink-0 ${ tx.type === 'invoice' ? 'bg-emerald-500/10 text-emerald-400' : tx.type === 'expense' ? 'bg-rose-500/10 text-rose-400' : 'bg-purple-500/10 text-purple-400' }`}>
                                                                                                        {tx.type === 'invoice' ? <ArrowDownRight size={16} /> : tx.type === 'pos' ? <ShoppingCart size={16} /> : getCategoryIcon(tx.label)}
                                                                                                    </div>
                                                                                                    <div className="min-w-0">
                                                                                                        <p className="text-sm font-medium text-white truncate">{tx.label}</p>
                                                                                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{tx.type}</p>
                                                                                                    </div>
                                                                                                </div>
                                                                                                
                                                                                                <div className="flex items-center justify-between sm:justify-end gap-4">
                                                                                                    <span className={`font-mono text-sm font-bold ${tx.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'}`}>{tx.type === 'expense' ? '-' : '+'}€{tx.amount.toFixed(2)}</span>
                                                                                                    <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                                                                                        {hasSourceDocument && (
                                                                                                            <button onClick={() => onViewSourceDocument((tx.raw as Expense).source_archive_id!, tx.label)} className="p-1.5 hover:bg-white/10 rounded-md text-sky-400" title={t('finance.viewSourceDoc')}><FileText size={14} /></button>
                                                                                                        )}
                                                                                                        {tx.type !== 'pos' ? (
                                                                                                            <>
                                                                                                                <button onClick={() => tx.type === 'invoice' ? onEditInvoice(tx.raw as Invoice) : onEditExpense(tx.raw as Expense)} className="p-1.5 hover:bg-white/10 rounded-md text-amber-400" title={t('general.edit')}><Edit2 size={14} /></button>
                                                                                                                <button onClick={() => tx.type === 'invoice' ? onViewInvoice(tx.raw as Invoice) : onViewExpense(tx.raw as Expense)} disabled={openingDocId === tx.id} className="p-1.5 hover:bg-white/10 rounded-md text-blue-400">
                                                                                                                    {openingDocId === tx.id ? <Loader2 size={14} className="animate-spin"/> : <Eye size={14} />}
                                                                                                                </button>
                                                                                                                <button onClick={() => tx.type === 'invoice' ? onDownloadInvoice(tx.id) : onDownloadExpense(tx.raw as Expense)} className="p-1.5 hover:bg-white/10 rounded-md text-green-400"><Download size={14} /></button>
                                                                                                                <button onClick={() => tx.type === 'invoice' ? onArchiveInvoice(tx.id) : onArchiveExpense(tx.id)} className="p-1.5 hover:bg-white/10 rounded-md text-indigo-400"><Archive size={14} /></button>
                                                                                                                <button onClick={() => tx.type === 'invoice' ? onDeleteInvoice(tx.id) : onDeleteExpense(tx.id)} className="p-1.5 hover:bg-white/10 rounded-md text-red-400"><Trash2 size={14} /></button>
                                                                                                            </>
                                                                                                        ) : (
                                                                                                            <button onClick={() => onDeletePos(tx.id)} className="p-1.5 hover:bg-white/10 rounded-md text-red-400"><Trash2 size={14} /></button>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </motion.div>
                                                                            )}
                                                                        </AnimatePresence>
                                                                    </div>
                                                                );
                                                            })}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
};