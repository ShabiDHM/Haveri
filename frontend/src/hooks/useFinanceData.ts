// FILE: src/hooks/useFinanceData.ts
// PHOENIX PROTOCOL - HOOK EXTRACTION V1.0
// Centralizes data fetching, refreshing, and deletion logic for the Finance module.

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { Invoice, Expense, Case, AnalyticsDashboardData, PosTransaction } from '../data/types';

export const useFinanceData = () => {
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [cases, setCases] = useState<Case[]>([]);
    const [posTransactions, setPosTransactions] = useState<PosTransaction[]>([]);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsDashboardData | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [inv, exp, cs, analytics, pos] = await Promise.all([
                apiService.getInvoices().catch(() => []),
                apiService.getExpenses().catch(() => []),
                apiService.getCases().catch(() => []),
                apiService.getAnalyticsDashboard(30).catch(() => null),
                apiService.getPosTransactions().catch(() => []),
            ]);
            setInvoices(inv);
            setExpenses(exp);
            setCases(cs);
            setAnalyticsData(analytics);
            setPosTransactions(pos);
        } catch (e) {
            console.error("Critical error loading finance data", e);
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshData = useCallback(async () => {
        // Silent refresh (no loading spinner)
        try {
            const [inv, exp, analytics, pos] = await Promise.all([
                apiService.getInvoices(),
                apiService.getExpenses(),
                apiService.getAnalyticsDashboard(30),
                apiService.getPosTransactions()
            ]);
            setInvoices(inv);
            setExpenses(exp);
            setAnalyticsData(analytics);
            setPosTransactions(pos);
        } catch (e) {
            console.error("Silent refresh failed", e);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Deletion Handlers
    const deleteInvoice = async (id: string) => {
        await apiService.deleteInvoice(id);
        await refreshData();
    };

    const deleteExpense = async (id: string) => {
        await apiService.deleteExpense(id);
        await refreshData();
    };

    const deletePosTransaction = async (id: string) => {
        await apiService.deletePosTransaction(id);
        await refreshData();
    };

    // Derived Totals
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const displayIncome = analyticsData ? analyticsData.total_revenue_period : 0;
    const displayProfit = analyticsData?.total_profit_period ?? (displayIncome - totalExpenses);
    const costOfGoodsSold = analyticsData ? displayIncome - displayProfit : 0;

    return {
        // State
        loading,
        invoices,
        expenses,
        cases,
        posTransactions,
        analyticsData,
        
        // Totals
        totalExpenses,
        displayIncome,
        displayProfit,
        costOfGoodsSold,

        // Actions
        refreshData,
        deleteInvoice,
        deleteExpense,
        deletePosTransaction
    };
};