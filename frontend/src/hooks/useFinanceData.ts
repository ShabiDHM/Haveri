// FILE: src/hooks/useFinanceData.ts
// V5 – Flat List support + mock fallback for empty data
// FIXED: Uses correct fields from Expense and PosTransaction types

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Invoice, Expense, Workspace, AnalyticsDashboardData, PosTransaction } from '../data/types';

// TransactionItem shape (mirrors the component's expectation)
export type TransactionItem = {
    id: string;
    type: 'invoice' | 'expense' | 'pos';
    date: string;
    amount: number;
    label: string;
    raw: any;
};

interface UseFinanceDataOptions {
    workspaceId?: string;
}

// Helper: safely convert any date string to Date object
const safeDate = (d: any): Date => {
    if (!d) return new Date();
    const date = new Date(d);
    return isNaN(date.getTime()) ? new Date() : date;
};

export const useFinanceData = (options?: UseFinanceDataOptions) => {
    const { selectedYear, setSelectedYear } = useAuth();
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [posTransactions, setPosTransactions] = useState<PosTransaction[]>([]);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsDashboardData | null>(null);
    const workspaceId = options?.workspaceId;

    // Compute allTransactions from the three data sources
    const allTransactions = useMemo<TransactionItem[]>(() => {
        const invoiceItems: TransactionItem[] = invoices.map(inv => ({
            id: inv.id,
            type: 'invoice',
            date: inv.issue_date,
            amount: inv.total_amount,
            label: inv.invoice_number || `Invoice ${inv.id.slice(0, 8)}`,
            raw: inv,
        }));

        const expenseItems: TransactionItem[] = expenses.map(exp => ({
            id: exp.id,
            type: 'expense',
            date: exp.date,
            amount: exp.amount,
            // Use category first, then description, fallback to ID
            label: exp.category || exp.description || `Expense ${exp.id.slice(0, 8)}`,
            raw: exp,
        }));

        const posItems: TransactionItem[] = posTransactions.map(pos => ({
            id: pos.id,
            type: 'pos',
            date: pos.transaction_date,
            amount: pos.total_price,
            label: pos.product_name || `POS ${pos.id.slice(0, 8)}`,
            raw: pos,
        }));

        // Combine and sort by date (newest first)
        return [...invoiceItems, ...expenseItems, ...posItems].sort((a, b) => {
            const dateA = safeDate(a.date);
            const dateB = safeDate(b.date);
            return dateB.getTime() - dateA.getTime();
        });
    }, [invoices, expenses, posTransactions]);

    // Mock transactions (used if real data is empty)
    const mockTransactions: TransactionItem[] = [
        {
            id: 'mock-1',
            type: 'invoice',
            date: new Date().toISOString(),
            amount: 250.00,
            label: 'Mock Invoice #001',
            raw: { id: 'mock-1', total_amount: 250, issue_date: new Date().toISOString() } as Invoice,
        },
        {
            id: 'mock-2',
            type: 'expense',
            date: new Date().toISOString(),
            amount: 45.50,
            label: 'Mock Office Supplies',
            raw: { id: 'mock-2', amount: 45.5, date: new Date().toISOString(), category: 'Office' } as Expense,
        },
    ];

    // Fetch all data with parallel calls and per‑fetch error logging
    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            setLoading(true);
            try {
                // Use Promise.allSettled so that one failing API doesn't break everything
                const results = await Promise.allSettled([
                    apiService.getInvoices(workspaceId),
                    apiService.getExpenses(workspaceId),
                    apiService.getWorkspaces(),
                    apiService.getPosTransactions(workspaceId),
                    apiService.getAnalyticsDashboard(undefined, selectedYear, workspaceId),
                ]);

                // Log raw data from each successful call (for debugging)
                console.log('[useFinanceData] Raw API responses:');
                if (results[0].status === 'fulfilled') {
                    console.log('  Invoices:', results[0].value);
                    setInvoices(results[0].value);
                } else {
                    console.error('  Invoices fetch failed:', results[0].reason);
                }
                if (results[1].status === 'fulfilled') {
                    console.log('  Expenses:', results[1].value);
                    setExpenses(results[1].value);
                } else {
                    console.error('  Expenses fetch failed:', results[1].reason);
                }
                if (results[2].status === 'fulfilled') {
                    console.log('  Workspaces:', results[2].value);
                    setWorkspaces(results[2].value);
                } else {
                    console.error('  Workspaces fetch failed:', results[2].reason);
                }
                if (results[3].status === 'fulfilled') {
                    console.log('  POS Transactions:', results[3].value);
                    setPosTransactions(results[3].value);
                } else {
                    console.error('  POS fetch failed:', results[3].reason);
                }
                if (results[4].status === 'fulfilled') {
                    console.log('  Analytics:', results[4].value);
                    setAnalyticsData(results[4].value);
                } else {
                    console.error('  Analytics fetch failed:', results[4].reason);
                }

                if (isMounted) {
                    // After all data is set, check if we have any real transactions
                    // The mock will be used by the component if allTransactions is empty
                }
            } catch (e) {
                console.error('[useFinanceData] Unexpected error:', e);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchData();
        return () => { isMounted = false; };
    }, [workspaceId, selectedYear]);

    const refreshData = useCallback(async () => {
        const [inv, exp, pos, analytics] = await Promise.all([
            apiService.getInvoices(workspaceId),
            apiService.getExpenses(workspaceId),
            apiService.getPosTransactions(workspaceId),
            apiService.getAnalyticsDashboard(undefined, selectedYear, workspaceId),
        ]);
        setInvoices(inv);
        setExpenses(exp);
        setPosTransactions(pos);
        setAnalyticsData(analytics);
    }, [selectedYear, workspaceId]);

    // Filtered totals (yearly) – keep for other UI parts
    const totalExpenses = useMemo(() =>
        expenses.filter(e => safeDate(e.date).getFullYear() === selectedYear)
                .reduce((sum, exp) => sum + exp.amount, 0),
        [expenses, selectedYear]
    );

    const displayIncome = useMemo(() => {
        const invInc = invoices.filter(i => i.status === 'PAID' && safeDate(i.issue_date).getFullYear() === selectedYear)
                              .reduce((s, i) => s + i.total_amount, 0);
        const posInc = posTransactions.filter(p => safeDate(p.transaction_date).getFullYear() === selectedYear)
                                      .reduce((s, p) => s + p.total_price, 0);
        return invInc + posInc;
    }, [invoices, posTransactions, selectedYear]);

    const costOfGoodsSold = analyticsData?.total_cogs_period ?? 0;
    const displayProfit = displayIncome - costOfGoodsSold - totalExpenses;

    const availableYears = useMemo(() => {
        const years = new Set<number>([new Date().getFullYear()]);
        invoices.forEach(i => { if (i.issue_date) years.add(safeDate(i.issue_date).getFullYear()); });
        expenses.forEach(e => { if (e.date) years.add(safeDate(e.date).getFullYear()); });
        posTransactions.forEach(p => {
            if (p.transaction_date) years.add(safeDate(p.transaction_date).getFullYear());
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [invoices, expenses, posTransactions]);

    // Force mock data if there are no real transactions (for debugging)
    const finalTransactions = allTransactions.length === 0 ? mockTransactions : allTransactions;

    return {
        loading,
        invoices,
        expenses,
        workspaces,
        posTransactions,
        analyticsData,
        selectedYear,
        setSelectedYear,
        availableYears,
        totalExpenses,
        displayIncome,
        displayProfit,
        costOfGoodsSold,
        refreshData,
        deleteInvoice: async (id: string) => { await apiService.deleteInvoice(id); refreshData(); },
        deleteExpense: async (id: string) => { await apiService.deleteExpense(id); refreshData(); },
        deletePosTransaction: async (id: string) => { await apiService.deletePosTransaction(id); refreshData(); },
        // Flat list of transactions (all, sorted, with mock fallback)
        allTransactions: finalTransactions,
    };
};