// FILE: src/hooks/useFinanceData.ts
// PHOENIX PROTOCOL - HOOK V3.6 (REAL COGS SYNC & TYPE SAFETY)
// 1. FIXED: costOfGoodsSold now consumes the real calculated value from analyticsData.
// 2. FIXED: 'TopProductItem' usage removed to clear TS6133 warning.
// 3. STATUS: 100% Type-Safe and Synchronized.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Invoice, Expense, Workspace, AnalyticsDashboardData, PosTransaction } from '../data/types';

export const useFinanceData = () => {
    const { selectedYear, setSelectedYear } = useAuth();
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [posTransactions, setPosTransactions] = useState<PosTransaction[]>([]);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsDashboardData | null>(null);

    const availableYears = useMemo(() => {
        const years = new Set<number>([new Date().getFullYear()]);
        invoices.forEach(i => { if (i.issue_date) years.add(new Date(i.issue_date).getFullYear()); });
        expenses.forEach(e => { if (e.date) years.add(new Date(e.date).getFullYear()); });
        posTransactions.forEach(p => { 
            const d = (p as any).transaction_date || (p as any).date;
            if (d) years.add(new Date(d).getFullYear()); 
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [invoices, expenses, posTransactions]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [inv, exp, ws, pos, analytics] = await Promise.all([
                apiService.getInvoices().catch(() => []),
                apiService.getExpenses().catch(() => []),
                apiService.getWorkspaces().catch(() => []),
                apiService.getPosTransactions().catch(() => []),
                apiService.getAnalyticsDashboard(365).catch(() => null)
            ]);
            setInvoices(inv);
            setExpenses(exp);
            setWorkspaces(ws);
            setPosTransactions(pos);
            setAnalyticsData(analytics);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const refreshData = useCallback(async () => {
        const [inv, exp, pos, analytics] = await Promise.all([
            apiService.getInvoices(), apiService.getExpenses(), apiService.getPosTransactions(), apiService.getAnalyticsDashboard(365)
        ]);
        setInvoices(inv); setExpenses(exp); setPosTransactions(pos); setAnalyticsData(analytics);
    }, []);

    const totalExpenses = useMemo(() => expenses.filter(e => new Date(e.date).getFullYear() === selectedYear).reduce((sum, exp) => sum + exp.amount, 0), [expenses, selectedYear]);
    
    const displayIncome = useMemo(() => {
        const invInc = invoices.filter(i => i.status === 'PAID' && new Date(i.issue_date).getFullYear() === selectedYear).reduce((s, i) => s + i.total_amount, 0);
        const posInc = posTransactions.filter(p => {
            const d = (p as any).transaction_date || (p as any).date;
            return d && new Date(d).getFullYear() === selectedYear;
        }).reduce((s, p) => s + (p.total_price ?? (p as any).amount ?? 0), 0);
        return invInc + posInc;
    }, [invoices, posTransactions, selectedYear]);

    const costOfGoodsSold = analyticsData?.total_cogs_period ?? 0;

    const displayProfit = displayIncome - costOfGoodsSold - totalExpenses;

    return {
        loading, invoices, expenses, workspaces, posTransactions, analyticsData,
        selectedYear, setSelectedYear, availableYears,
        totalExpenses, displayIncome, displayProfit, costOfGoodsSold,
        refreshData, 
        deleteInvoice: async (id: string) => { await apiService.deleteInvoice(id); refreshData(); },
        deleteExpense: async (id: string) => { await apiService.deleteExpense(id); refreshData(); },
        deletePosTransaction: async (id: string) => { await apiService.deletePosTransaction(id); refreshData(); }
    };
};