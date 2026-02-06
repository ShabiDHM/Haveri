// FILE: src/hooks/useFinanceData.ts
// PHOENIX PROTOCOL - HOOK V3.1 (WORKSPACE REBRAND)
// 1. REBRAND: Renamed 'Case' to 'Workspace' throughout the hook.
// 2. SYNC: Updated API call to 'getWorkspaces'.
// 3. STATUS: Fully synchronized.

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { Invoice, Expense, Workspace, AnalyticsDashboardData, PosTransaction, TopProductItem } from '../data/types';

export const useFinanceData = () => {
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]); // PHOENIX: Renamed
    const [posTransactions, setPosTransactions] = useState<PosTransaction[]>([]);
    
    const [analyticsData, setAnalyticsData] = useState<AnalyticsDashboardData | null>(null);

    const computeLocalAnalytics = useCallback((
        currentInvoices: Invoice[], 
        currentExpenses: Expense[], 
        currentPos: PosTransaction[]
    ): AnalyticsDashboardData => {
        
        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (29 - i));
            return d.toISOString().split('T')[0];
        });

        const sales_trend = last30Days.map(dateStr => {
            const invSum = currentInvoices
                .filter(i => (i.issue_date && i.issue_date.startsWith(dateStr)) && i.status === 'PAID')
                .reduce((sum, i) => sum + i.total_amount, 0);
            
            const posSum = currentPos
                .filter(p => {
                    const pDate = (p as any).transaction_date || (p as any).date || ""; 
                    return typeof pDate === 'string' && pDate.startsWith(dateStr);
                })
                .reduce((sum, p) => sum + (p.total_price ?? (p as any).amount ?? 0), 0);

            return { date: dateStr, amount: invSum + posSum };
        });

        const productRevenueMap: Record<string, number> = {};
        const productQtyMap: Record<string, number> = {};
        
        currentInvoices.forEach(inv => {
            if (inv.status === 'PAID') {
                inv.items.forEach(item => {
                    const name = item.description || "Unknown";
                    productRevenueMap[name] = (productRevenueMap[name] || 0) + item.total;
                    productQtyMap[name] = (productQtyMap[name] || 0) + item.quantity;
                });
            }
        });
        
        currentPos.forEach(p => {
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

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

        const total_revenue_period = sales_trend.reduce((sum, day) => sum + day.amount, 0);
        const total_transactions_period = currentInvoices.length + currentPos.length;
        
        const periodExpenses = currentExpenses
            .filter(e => e.date >= cutoffDate)
            .reduce((sum, e) => sum + e.amount, 0);

        return {
            total_revenue_period,
            total_transactions_period,
            total_profit_period: total_revenue_period - periodExpenses,
            sales_trend,
            top_products
        };
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // PHOENIX: Swapped getCases for getWorkspaces
            const [inv, exp, ws, pos] = await Promise.all([
                apiService.getInvoices().catch(() => []),
                apiService.getExpenses().catch(() => []),
                apiService.getWorkspaces().catch(() => []),
                apiService.getPosTransactions().catch(() => []),
            ]);

            setInvoices(inv);
            setExpenses(exp);
            setWorkspaces(ws); // PHOENIX: Renamed
            setPosTransactions(pos);

            const computed = computeLocalAnalytics(inv, exp, pos);
            setAnalyticsData(computed);

        } catch (e) {
            console.error("Critical error loading finance data", e);
        } finally {
            setLoading(false);
        }
    }, [computeLocalAnalytics]);

    const refreshData = useCallback(async () => {
        try {
            const [inv, exp, pos] = await Promise.all([
                apiService.getInvoices(),
                apiService.getExpenses(),
                apiService.getPosTransactions()
            ]);
            setInvoices(inv);
            setExpenses(exp);
            setPosTransactions(pos);
            
            const computed = computeLocalAnalytics(inv, exp, pos);
            setAnalyticsData(computed);
            
        } catch (e) {
            console.error("Silent refresh failed", e);
        }
    }, [computeLocalAnalytics]);

    useEffect(() => {
        loadData();
    }, [loadData]);

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

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const displayIncome = analyticsData?.total_revenue_period ?? 0;
    
    const displayProfit = analyticsData?.total_profit_period !== undefined 
        ? analyticsData.total_profit_period 
        : (displayIncome - totalExpenses);

    const costOfGoodsSold = displayIncome - displayProfit;

    return {
        // State
        loading,
        invoices,
        expenses,
        workspaces, // PHOENIX: Renamed
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