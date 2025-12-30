// FILE: src/hooks/useFinanceData.ts
// PHOENIX PROTOCOL - HOOK V3.0 (ROBUST TYPE-SAFE ANALYTICS)
// 1. FIX: Aligned 'TopProductItem' properties with types.ts (quantity_sold -> total_quantity).
// 2. FIX: Added safety checks for undefined 'analyticsData'.
// 3. CLEAN: Removed unused variables and ensured strict TypeScript compliance.

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { Invoice, Expense, Case, AnalyticsDashboardData, PosTransaction, TopProductItem } from '../data/types';

export const useFinanceData = () => {
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [cases, setCases] = useState<Case[]>([]);
    const [posTransactions, setPosTransactions] = useState<PosTransaction[]>([]);
    
    // Initialized as null, populated via backend or local computation
    const [analyticsData, setAnalyticsData] = useState<AnalyticsDashboardData | null>(null);

    // --- CLIENT-SIDE ANALYTICS ENGINE ---
    const computeLocalAnalytics = useCallback((
        currentInvoices: Invoice[], 
        currentExpenses: Expense[], 
        currentPos: PosTransaction[]
    ): AnalyticsDashboardData => {
        
        // 1. Generate Date Range (Last 30 Days)
        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (29 - i));
            return d.toISOString().split('T')[0];
        });

        // 2. Calculate Sales Trend
        const sales_trend = last30Days.map(dateStr => {
            // Sum Invoices for this day
            const invSum = currentInvoices
                .filter(i => (i.issue_date && i.issue_date.startsWith(dateStr)) && i.status === 'PAID')
                .reduce((sum, i) => sum + i.total_amount, 0);
            
            // Sum POS for this day
            const posSum = currentPos
                .filter(p => {
                    const pDate = (p as any).transaction_date || (p as any).date || ""; 
                    return typeof pDate === 'string' && pDate.startsWith(dateStr);
                })
                .reduce((sum, p) => sum + (p.total_price ?? (p as any).amount ?? 0), 0);

            return { date: dateStr, amount: invSum + posSum };
        });

        // 3. Calculate Top Products
        const productRevenueMap: Record<string, number> = {};
        const productQtyMap: Record<string, number> = {};
        
        // From Invoices
        currentInvoices.forEach(inv => {
            if (inv.status === 'PAID') {
                inv.items.forEach(item => {
                    const name = item.description || "Unknown";
                    productRevenueMap[name] = (productRevenueMap[name] || 0) + item.total;
                    productQtyMap[name] = (productQtyMap[name] || 0) + item.quantity;
                });
            }
        });
        
        // From POS
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

        // 4. Calculate Period Totals (Last 30 days)
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
            // Parallel Fetch
            const [inv, exp, cs, pos] = await Promise.all([
                apiService.getInvoices().catch(() => []),
                apiService.getExpenses().catch(() => []),
                apiService.getCases().catch(() => []),
                apiService.getPosTransactions().catch(() => []),
            ]);

            setInvoices(inv);
            setExpenses(exp);
            setCases(cs);
            setPosTransactions(pos);

            // Compute Analytics Locally immediately
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
            
            // Re-compute instantly on refresh
            const computed = computeLocalAnalytics(inv, exp, pos);
            setAnalyticsData(computed);
            
        } catch (e) {
            console.error("Silent refresh failed", e);
        }
    }, [computeLocalAnalytics]);

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

    // Derived Totals (Global, not just period)
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const displayIncome = analyticsData?.total_revenue_period ?? 0;
    
    // Safe check for undefined total_profit_period
    const displayProfit = analyticsData?.total_profit_period !== undefined 
        ? analyticsData.total_profit_period 
        : (displayIncome - totalExpenses);

    const costOfGoodsSold = displayIncome - displayProfit;

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