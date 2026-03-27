// FILE: src/hooks/useFinanceData.ts
// PHOENIX PROTOCOL - HOOK V4.2 (CLEAN FETCH)

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Invoice, Expense, Workspace, AnalyticsDashboardData, PosTransaction } from '../data/types';

interface UseFinanceDataOptions {
    workspaceId?: string;
}

export const useFinanceData = (options?: UseFinanceDataOptions) => {
    const { selectedYear, setSelectedYear } = useAuth();
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [posTransactions, setPosTransactions] = useState<PosTransaction[]>([]);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsDashboardData | null>(null);
    const workspaceId = options?.workspaceId;


    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [inv, exp, ws, pos, analytics] = await Promise.all([
                    apiService.getInvoices(workspaceId),
                    apiService.getExpenses(workspaceId),
                    apiService.getWorkspaces(),
                    apiService.getPosTransactions(workspaceId),
                    apiService.getAnalyticsDashboard(undefined, selectedYear, workspaceId)
                ]);
                if (isMounted) {
                    setInvoices(inv);
                    setExpenses(exp);
                    setWorkspaces(ws);
                    setPosTransactions(pos);
                    setAnalyticsData(analytics);
                }
            } catch (e) {
                if (isMounted) console.error("[Finance Hook] Data load failed:", e);
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
            apiService.getAnalyticsDashboard(undefined, selectedYear, workspaceId)
        ]);
        setInvoices(inv);
        setExpenses(exp);
        setPosTransactions(pos);
        setAnalyticsData(analytics);
    }, [selectedYear, workspaceId]);

    const totalExpenses = useMemo(() => 
        expenses.filter(e => new Date(e.date).getFullYear() === selectedYear)
                .reduce((sum, exp) => sum + exp.amount, 0), 
    [expenses, selectedYear]);

    const displayIncome = useMemo(() => {
        const invInc = invoices.filter(i => i.status === 'PAID' && new Date(i.issue_date).getFullYear() === selectedYear)
                              .reduce((s, i) => s + i.total_amount, 0);
        const posInc = posTransactions.filter(p => {
            const d = p.transaction_date || (p as any).date_time || (p as any).date;
            return d && new Date(d).getFullYear() === selectedYear;
        }).reduce((s, p) => s + (p.total_price ?? (p as any).amount ?? 0), 0);
        return invInc + posInc;
    }, [invoices, posTransactions, selectedYear]);

    const costOfGoodsSold = analyticsData?.total_cogs_period ?? 0;
    const displayProfit = displayIncome - costOfGoodsSold - totalExpenses;

    const availableYears = useMemo(() => {
        const years = new Set<number>([new Date().getFullYear()]);
        invoices.forEach(i => { if (i.issue_date) years.add(new Date(i.issue_date).getFullYear()); });
        expenses.forEach(e => { if (e.date) years.add(new Date(e.date).getFullYear()); });
        posTransactions.forEach(p => { 
            const d = p.transaction_date || (p as any).date_time || (p as any).date;
            if (d) years.add(new Date(d).getFullYear()); 
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [invoices, expenses, posTransactions]);

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
        deletePosTransaction: async (id: string) => { await apiService.deletePosTransaction(id); refreshData(); }
    };
};