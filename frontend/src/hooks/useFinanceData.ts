// FILE: src/hooks/useFinanceData.ts
// V7 – Added COGS calculation using inventory

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Invoice, Expense, Workspace, AnalyticsDashboardData, PosTransaction, InventoryItem } from '../data/types';

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
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const workspaceId = options?.workspaceId;

    // Helper to get latest year from transactions
    const getLatestYear = useCallback(() => {
        const years = new Set<number>();
        invoices.forEach(i => { if (i.issue_date) years.add(safeDate(i.issue_date).getFullYear()); });
        expenses.forEach(e => { if (e.date) years.add(safeDate(e.date).getFullYear()); });
        posTransactions.forEach(p => { if (p.transaction_date) years.add(safeDate(p.transaction_date).getFullYear()); });
        const yearArray = Array.from(years);
        return yearArray.length ? Math.max(...yearArray) : new Date().getFullYear();
    }, [invoices, expenses, posTransactions]);

    // Sync selectedYear to the latest available year
    useEffect(() => {
        if (!loading && invoices.length + expenses.length + posTransactions.length > 0) {
            const latestYear = getLatestYear();
            if (!selectedYear || selectedYear !== latestYear) {
                setSelectedYear(latestYear);
            }
        }
    }, [loading, invoices, expenses, posTransactions, selectedYear, setSelectedYear, getLatestYear]);

    // ---- Compute allTransactions (unchanged) ----
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
        return [...invoiceItems, ...expenseItems, ...posItems].sort((a, b) => {
            const dateA = safeDate(a.date);
            const dateB = safeDate(b.date);
            return dateB.getTime() - dateA.getTime();
        });
    }, [invoices, expenses, posTransactions]);

    // ---- Mock transactions (unchanged) ----
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

    // ---- Fetch all data including inventory ----
    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            setLoading(true);
            try {
                const results = await Promise.allSettled([
                    apiService.getInvoices(workspaceId),
                    apiService.getExpenses(workspaceId),
                    apiService.getWorkspaces(),
                    apiService.getPosTransactions(workspaceId),
                    apiService.getAnalyticsDashboard(undefined, selectedYear, workspaceId),
                    apiService.getInventoryItems(workspaceId), // NEW: fetch inventory
                ]);
                console.log('[useFinanceData] Raw API responses:');
                if (results[0].status === 'fulfilled') {
                    console.log('  Invoices:', results[0].value);
                    setInvoices(results[0].value);
                } else console.error('  Invoices fetch failed:', results[0].reason);
                if (results[1].status === 'fulfilled') {
                    console.log('  Expenses:', results[1].value);
                    setExpenses(results[1].value);
                } else console.error('  Expenses fetch failed:', results[1].reason);
                if (results[2].status === 'fulfilled') {
                    console.log('  Workspaces:', results[2].value);
                    setWorkspaces(results[2].value);
                } else console.error('  Workspaces fetch failed:', results[2].reason);
                if (results[3].status === 'fulfilled') {
                    console.log('  POS Transactions:', results[3].value);
                    setPosTransactions(results[3].value);
                } else console.error('  POS fetch failed:', results[3].reason);
                if (results[4].status === 'fulfilled') {
                    console.log('  Analytics:', results[4].value);
                    setAnalyticsData(results[4].value);
                } else console.error('  Analytics fetch failed:', results[4].reason);
                if (results[5].status === 'fulfilled') {
                    console.log('  Inventory Items:', results[5].value);
                    setInventoryItems(results[5].value);
                } else console.error('  Inventory fetch failed:', results[5].reason);
                if (isMounted) {}
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
        const [inv, exp, pos, analytics, inventory] = await Promise.all([
            apiService.getInvoices(workspaceId),
            apiService.getExpenses(workspaceId),
            apiService.getPosTransactions(workspaceId),
            apiService.getAnalyticsDashboard(undefined, selectedYear, workspaceId),
            apiService.getInventoryItems(workspaceId),
        ]);
        setInvoices(inv);
        setExpenses(exp);
        setPosTransactions(pos);
        setAnalyticsData(analytics);
        setInventoryItems(inventory);
    }, [selectedYear, workspaceId]);

    // ---- Fixed: totalExpenses with robust year comparison ----
    const totalExpenses = useMemo(() => {
        const yearToUse = selectedYear ?? getLatestYear();
        console.log(`[DEBUG] totalExpenses using year: ${yearToUse}`);
        const total = expenses
            .filter(e => Number(safeDate(e.date).getFullYear()) === Number(yearToUse))
            .reduce((sum, exp) => sum + exp.amount, 0);
        console.log(`[DEBUG] totalExpenses = €${total.toFixed(2)}`);
        return total;
    }, [expenses, selectedYear, getLatestYear]);

    // ---- Fixed: displayIncome with robust year comparison ----
    const displayIncome = useMemo(() => {
        const yearToUse = selectedYear ?? getLatestYear();
        console.log(`[DEBUG] displayIncome using year: ${yearToUse}`);
        const invInc = invoices
            .filter(i => i.status === 'PAID' && Number(safeDate(i.issue_date).getFullYear()) === Number(yearToUse))
            .reduce((s, i) => s + i.total_amount, 0);
        const posInc = posTransactions
            .filter(p => Number(safeDate(p.transaction_date).getFullYear()) === Number(yearToUse))
            .reduce((s, p) => s + p.total_price, 0);
        const total = invInc + posInc;
        console.log(`[DEBUG] displayIncome = €${total.toFixed(2)}`);
        return total;
    }, [invoices, posTransactions, selectedYear, getLatestYear]);

    // ---- NEW: COGS Calculation ----
    const costOfGoodsSold = useMemo(() => {
        // Create a map of product name -> cost per unit from inventory
        const inventoryMap = new Map<string, number>();
        inventoryItems.forEach(item => {
            inventoryMap.set(item.name.toLowerCase(), item.cost_per_unit);
        });

        let totalCogs = 0;

        // 1. Process invoices
        invoices.forEach(invoice => {
            invoice.items.forEach(item => {
                const productName = item.description?.toLowerCase() || '';
                const quantity = item.quantity;
                const cost = inventoryMap.get(productName) ?? 0;
                const itemCogs = quantity * cost;
                if (cost > 0) {
                    console.log(`[DEBUG COGS] Invoice ${invoice.invoice_number} - ${item.description}: ${quantity} × €${cost} = €${itemCogs.toFixed(2)}`);
                } else {
                    console.warn(`[DEBUG COGS] No inventory match for product: ${item.description} (cost set to 0)`);
                }
                totalCogs += itemCogs;
            });
        });

        // 2. Process POS transactions
        posTransactions.forEach(pos => {
            const productName = pos.product_name?.toLowerCase() || '';
            const quantity = pos.quantity ?? 1; // fallback to 1 if quantity missing
            const cost = inventoryMap.get(productName) ?? 0;
            const itemCogs = quantity * cost;
            if (cost > 0) {
                console.log(`[DEBUG COGS] POS ${pos.id} - ${pos.product_name}: ${quantity} × €${cost} = €${itemCogs.toFixed(2)}`);
            } else {
                console.warn(`[DEBUG COGS] No inventory match for POS product: ${pos.product_name} (cost set to 0)`);
            }
            totalCogs += itemCogs;
        });

        console.log(`[DEBUG COGS] Total COGS = €${totalCogs.toFixed(2)}`);
        return totalCogs;
    }, [invoices, posTransactions, inventoryItems]);

    const displayProfit = displayIncome - costOfGoodsSold - totalExpenses;

    // ---- Available years (unchanged, but type-safe) ----
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        invoices.forEach(i => { if (i.issue_date) years.add(safeDate(i.issue_date).getFullYear()); });
        expenses.forEach(e => { if (e.date) years.add(safeDate(e.date).getFullYear()); });
        posTransactions.forEach(p => { if (p.transaction_date) years.add(safeDate(p.transaction_date).getFullYear()); });
        return Array.from(years).sort((a, b) => b - a);
    }, [invoices, expenses, posTransactions]);

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
        allTransactions: finalTransactions,
    };
};