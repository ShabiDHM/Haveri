// FILE: src/hooks/useFinanceData.ts
// PHOENIX PROTOCOL - HOOK V3.2 (MULTI-YEAR SUPPORT)
// 1. FEATURE: Added 'selectedYear' state to support historical business auditing.
// 2. LOGIC: Automatically extracts all unique years from invoices/expenses/pos.
// 3. SYNC: Metrics and analytics now filter based on the active UI year.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '../services/api';
import { Invoice, Expense, Workspace, AnalyticsDashboardData, PosTransaction, TopProductItem } from '../data/types';

export const useFinanceData = () => {
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [posTransactions, setPosTransactions] = useState<PosTransaction[]>([]);
    
    // PHOENIX: Multi-Year State
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // PHOENIX: Extract all years present in the database
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

    const computeYearlyAnalytics = useCallback((
        year: number,
        currentInvoices: Invoice[], 
        currentExpenses: Expense[], 
        currentPos: PosTransaction[]
    ): AnalyticsDashboardData => {
        
        // Filter data for the selected year
        const yearInvoices = currentInvoices.filter(i => new Date(i.issue_date).getFullYear() === year);
        const yearExpenses = currentExpenses.filter(e => new Date(e.date).getFullYear() === year);
        const yearPos = currentPos.filter(p => {
            const d = (p as any).transaction_date || (p as any).date;
            return d && new Date(d).getFullYear() === year;
        });

        const productRevenueMap: Record<string, number> = {};
        const productQtyMap: Record<string, number> = {};
        
        yearInvoices.forEach(inv => {
            if (inv.status === 'PAID') {
                inv.items.forEach(item => {
                    const name = item.description || "Unknown";
                    productRevenueMap[name] = (productRevenueMap[name] || 0) + item.total;
                    productQtyMap[name] = (productQtyMap[name] || 0) + item.quantity;
                });
            }
        });
        
        yearPos.forEach(p => {
            const name = p.product_name || (p as any).description || "POS Sale";
            const amt = p.total_price ?? (p as any).amount ?? 0;
            const qty = p.quantity ?? (p as any).qty ?? 1;
            productRevenueMap[name] = (productRevenueMap[name] || 0) + amt;
            productQtyMap[name] = (productQtyMap[name] || 0) + qty;
        });

        const top_products: TopProductItem[] = Object.entries(productRevenueMap)
            .map(([name, val]) => ({ 
                product_name: name, 
                total_revenue: val, 
                total_quantity: productQtyMap[name] || 0 
            }))
            .sort((a, b) => b.total_revenue - a.total_revenue)
            .slice(0, 5);

        const total_revenue_period = yearInvoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.total_amount, 0) + 
                                   yearPos.reduce((s, p) => s + (p.total_price ?? (p as any).amount ?? 0), 0);
        
        const total_expenses_period = yearExpenses.reduce((s, e) => s + e.amount, 0);

        return {
            total_revenue_period,
            total_transactions_period: yearInvoices.length + yearPos.length,
            total_profit_period: total_revenue_period - total_expenses_period,
            sales_trend: [], // Trends usually handled by specific charts
            top_products
        };
    }, []);

    const [analyticsData, setAnalyticsData] = useState<AnalyticsDashboardData | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [inv, exp, ws, pos] = await Promise.all([
                apiService.getInvoices().catch(() => []),
                apiService.getExpenses().catch(() => []),
                apiService.getWorkspaces().catch(() => []),
                apiService.getPosTransactions().catch(() => []),
            ]);
            setInvoices(inv);
            setExpenses(exp);
            setWorkspaces(ws);
            setPosTransactions(pos);
            setAnalyticsData(computeYearlyAnalytics(selectedYear, inv, exp, pos));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }, [selectedYear, computeYearlyAnalytics]);

    useEffect(() => { loadData(); }, [loadData]);

    const refreshData = async () => {
        const [inv, exp, pos] = await Promise.all([
            apiService.getInvoices(), apiService.getExpenses(), apiService.getPosTransactions()
        ]);
        setInvoices(inv); setExpenses(exp); setPosTransactions(pos);
        setAnalyticsData(computeYearlyAnalytics(selectedYear, inv, exp, pos));
    };

    const totalExpenses = expenses.filter(e => new Date(e.date).getFullYear() === selectedYear).reduce((sum, exp) => sum + exp.amount, 0);
    const displayIncome = analyticsData?.total_revenue_period ?? 0;
    const displayProfit = analyticsData?.total_profit_period ?? (displayIncome - totalExpenses);
    const costOfGoodsSold = displayIncome - displayProfit;

    return {
        loading, invoices, expenses, workspaces, posTransactions, analyticsData,
        selectedYear, setSelectedYear, availableYears, // PHOENIX: Exposed year control
        totalExpenses, displayIncome, displayProfit, costOfGoodsSold,
        refreshData, 
        deleteInvoice: async (id: string) => { await apiService.deleteInvoice(id); refreshData(); },
        deleteExpense: async (id: string) => { await apiService.deleteExpense(id); refreshData(); },
        deletePosTransaction: async (id: string) => { await apiService.deletePosTransaction(id); refreshData(); }
    };
};