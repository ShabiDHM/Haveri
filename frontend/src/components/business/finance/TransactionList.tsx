// FILE: src/components/business/finance/TransactionList.tsx
// PHOENIX PROTOCOL - COMPONENT EXTRACTION V1.0
// Handles the rendering of Single and Grouped transactions.
// Contains the accordion logic and styling details.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FileText, MinusCircle, ShoppingCart, Layers, CreditCard,
    Edit2, Eye, Download, Archive, Trash2, ChevronDown, ChevronUp,
    Car, Utensils, Coffee, Building, Users, Landmark, Zap, Wifi, ArrowUpRight, ArrowDownRight, Calendar, Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Invoice, Expense } from '../../../data/types';

// --- TYPES ---
export type TransactionItem = {
    id: string;
    type: 'invoice' | 'expense' | 'pos';
    date: string;
    amount: number;
    label: string;
    raw: any;
};

export type GroupedTransaction = 
    | { type: 'single'; data: TransactionItem }
    | { type: 'group'; date: string; groupType: 'invoice' | 'expense' | 'pos'; totalAmount: number; count: number; items: TransactionItem[] };

// --- PROPS ---
interface TransactionListProps {
    groupedList: GroupedTransaction[];
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
}

export const TransactionList: React.FC<TransactionListProps> = ({
    groupedList, openingDocId,
    onEditInvoice, onEditExpense, onViewInvoice, onViewExpense,
    onDownloadInvoice, onDownloadExpense, onArchiveInvoice, onArchiveExpense,
    onDeleteInvoice, onDeleteExpense, onDeletePos
}) => {
    const { t } = useTranslation();
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const toggleGroup = (key: string) => {
        const newSet = new Set(expandedGroups);
        if (newSet.has(key)) newSet.delete(key);
        else newSet.add(key);
        setExpandedGroups(newSet);
    };

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

    const getBatchStyles = (type: 'invoice' | 'expense' | 'pos') => {
        if (type === 'invoice') return { 
            bg: 'bg-emerald-500/10', text: 'text-emerald-400', 
            icon: <FileText className="w-4 h-4 sm:w-5 sm:h-5" />, 
            title: t('finance.invoiceDailySummary'),
            amountColor: 'text-emerald-400',
            labelKey: 'finance.invoiceCount'
        };
        if (type === 'expense') return { 
            bg: 'bg-rose-500/10', text: 'text-rose-400', 
            icon: <MinusCircle className="w-4 h-4 sm:w-5 sm:h-5" />, 
            title: t('finance.expenseDailySummary'),
            amountColor: 'text-rose-400',
            labelKey: 'finance.expenseCount'
        };
        return { 
            bg: 'bg-purple-500/10', text: 'text-purple-400', 
            icon: <Layers className="w-4 h-4 sm:w-5 sm:h-5" />, 
            title: t('finance.posDailySummary'),
            amountColor: 'text-purple-400',
            labelKey: 'finance.posCount'
        };
    };

    if (groupedList.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <ShoppingCart size={48} className="mb-4 opacity-20" />
                <p>{t('finance.noTransactions')}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-2">
            {groupedList.map((item) => {
                if (item.type === 'single') {
                    const tx = item.data;
                    return (
                        <div key={`${tx.type}-${tx.id}`} className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/5 cursor-default gap-3">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                <div className={`p-2 sm:p-3 rounded-xl flex-shrink-0 ${tx.type === 'invoice' || tx.type === 'pos' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                    {tx.type === 'invoice' ? <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5" /> : tx.type === 'pos' ? <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" /> : getCategoryIcon(tx.label)}
                                </div>
                                <div className="min-w-0 truncate">
                                    <h4 className="font-semibold text-white truncate text-sm sm:text-base">{tx.label}</h4>
                                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 truncate">
                                        <Calendar size={12} />
                                        <span>{new Date(tx.date).toLocaleDateString()}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-600 flex-shrink-0"></span>
                                        <span className="uppercase text-[10px] tracking-wider bg-white/5 px-1.5 rounded flex-shrink-0">{t(`finance.types.${tx.type}`, tx.type)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-row sm:items-center justify-between sm:justify-end gap-3 sm:gap-6 w-full sm:w-auto mt-1 sm:mt-0 pl-[52px] sm:pl-0">
                                <span className={`text-base sm:text-lg font-bold font-mono ${tx.type === 'invoice' || tx.type === 'pos' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {tx.type === 'invoice' || tx.type === 'pos' ? '+' : '-'}€{(tx.amount || 0).toFixed(2)}
                                </span>
                                <div className="flex items-center gap-1 transition-opacity">
                                    {tx.type !== 'pos' ? (
                                        <>
                                            <button onClick={() => tx.type === 'invoice' ? onEditInvoice(tx.raw as Invoice) : onEditExpense(tx.raw as Expense)} className="p-2 hover:bg-white/10 rounded-lg text-amber-400 hover:text-amber-300" title={t('general.edit')}><Edit2 size={16} /></button>
                                            <button onClick={() => tx.type === 'invoice' ? onViewInvoice(tx.raw as Invoice) : onViewExpense(tx.raw as Expense)} disabled={openingDocId === tx.id} className="p-2 hover:bg-white/10 rounded-lg text-blue-400 hover:text-blue-300" title={t('general.view')}>{openingDocId === tx.id ? <Loader2 size={16} className="animate-spin"/> : <Eye size={16} />}</button>
                                            <button onClick={() => tx.type === 'invoice' ? onDownloadInvoice(tx.id) : onDownloadExpense(tx.raw as Expense)} className="p-2 hover:bg-white/10 rounded-lg text-green-400 hover:text-green-300" title={t('general.download')}><Download size={16} /></button>
                                            <button onClick={() => tx.type === 'invoice' ? onArchiveInvoice(tx.id) : onArchiveExpense(tx.id)} className="p-2 hover:bg-white/10 rounded-lg text-indigo-400 hover:text-indigo-300" title={t('general.archive')}><Archive size={16} /></button>
                                            <button onClick={() => tx.type === 'invoice' ? onDeleteInvoice(tx.id) : onDeleteExpense(tx.id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400 hover:text-red-300" title={t('general.delete')}><Trash2 size={16} /></button>
                                        </>
                                    ) : (
                                        <button onClick={() => onDeletePos(tx.id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400 hover:text-red-300" title={t('general.delete')}><Trash2 size={16} /></button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                } else {
                    // GROUP BATCH
                    const isExpanded = expandedGroups.has(item.date + item.groupType);
                    const styles = getBatchStyles(item.groupType);
                    const isIncome = item.groupType !== 'expense';

                    return (
                        <div key={`group-${item.date}-${item.groupType}`} className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                            <div 
                                onClick={() => toggleGroup(item.date + item.groupType)}
                                className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-white/5 transition-colors gap-2"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`p-2 sm:p-3 rounded-xl flex-shrink-0 ${styles.bg} ${styles.text}`}>
                                        {styles.icon}
                                    </div>
                                    <div className="min-w-0 truncate">
                                        <h4 className="font-semibold text-white text-sm sm:text-base truncate">{styles.title}</h4>
                                        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 truncate">
                                            <span>{item.date}</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-600 flex-shrink-0"></span>
                                            <span className="text-gray-400 truncate">{t(styles.labelKey, { count: item.count })}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
                                    <span className={`text-sm sm:text-lg font-bold font-mono ${styles.amountColor}`}>
                                        {isIncome ? '+' : '-'}€{item.totalAmount.toFixed(2)}
                                    </span>
                                    {isExpanded ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                                </div>
                            </div>
                            
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-white/10 bg-black/40"
                                    >
                                        {item.items.map(subTx => (
                                            <div key={subTx.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center px-3 sm:px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 pl-14 sm:pl-16">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {subTx.type === 'pos' ? <ShoppingCart size={14} className="text-gray-600 flex-shrink-0" /> : <CreditCard size={14} className="text-gray-600 flex-shrink-0" />}
                                                    <span className="text-gray-300 text-xs sm:text-sm font-medium truncate">{subTx.label}</span>
                                                </div>
                                                <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0">
                                                    <span className={`font-mono text-xs sm:text-sm ${subTx.type === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                        {subTx.type === 'expense' ? '-' : '+'}€{subTx.amount.toFixed(2)}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        {subTx.type !== 'pos' ? (
                                                            <>
                                                                <button onClick={() => subTx.type === 'invoice' ? onEditInvoice(subTx.raw as Invoice) : onEditExpense(subTx.raw as Expense)} className="text-gray-500 hover:text-amber-400"><Edit2 size={14} /></button>
                                                                <button onClick={() => subTx.type === 'invoice' ? onViewInvoice(subTx.raw as Invoice) : onViewExpense(subTx.raw as Expense)} disabled={openingDocId === subTx.id} className="text-gray-500 hover:text-blue-400">
                                                                    {openingDocId === subTx.id ? <Loader2 size={14} className="animate-spin"/> : <Eye size={14} />}
                                                                </button>
                                                                <button onClick={() => subTx.type === 'invoice' ? onDownloadInvoice(subTx.id) : onDownloadExpense(subTx.raw as Expense)} className="text-gray-500 hover:text-green-400"><Download size={14} /></button>
                                                                <button onClick={() => subTx.type === 'invoice' ? onArchiveInvoice(subTx.id) : onArchiveExpense(subTx.id)} className="text-gray-500 hover:text-indigo-400"><Archive size={14} /></button>
                                                                <button onClick={() => subTx.type === 'invoice' ? onDeleteInvoice(subTx.id) : onDeleteExpense(subTx.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
                                                            </>
                                                        ) : (
                                                            <button onClick={() => onDeletePos(subTx.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                }
            })}
        </div>
    );
};