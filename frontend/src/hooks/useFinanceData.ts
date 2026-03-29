// FILE: src/hooks/useFinanceData.ts
// V9 – Full feature set: year sync, COGS with partial matching

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

    // Helper to get the latest year from all transaction data
    const getLatestYear = useCallback(() => {
        const years = new Set<number>();
        invoices.forEach(i => { if (i.issue_date) years.add(safeDate(i.issue_date).getFullYear()); });
        expenses.forEach(e => { if (e.date) years.add(safeDate(e.date).getFullYear()); });
        posTransactions.forEach(p => { if (p.transaction_date) years.add(safeDate(p.transaction_date).getFullYear()); });
        const yearArray = Array.from(years);
        return yearArray.length ? Math.max(...yearArray) : new Date().getFullYear();
    }, [invoices, expenses, posTransactions]);

    // Sync selectedYear to the latest available year if it's not set or invalid
    useEffect(() => {
        if (!loading && invoices.length + expenses.length + posTransactions.length > 0) {
            const latestYear = getLatestYear();
            if (!selectedYear || selectedYear !== latestYear) {
                setSelectedYear(latestYear);
            }
        }
    }, [loading, invoices, expenses, posTransactions, selectedYear, setSelectedYear, getLatestYear]);

    // Compute allTransactions (combined, sorted)
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

    // Mock transactions (for development / empty state)
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

    // Fetch all data (including inventory)
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
                    apiService.getInventoryItems(workspaceId),
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

    // Total Expenses (yearly)
    const totalExpenses = useMemo(() => {
        const yearToUse = selectedYear ?? getLatestYear();
        console.log(`[DEBUG] totalExpenses using year: ${yearToUse}`);
        const total = expenses
            .filter(e => Number(safeDate(e.date).getFullYear()) === Number(yearToUse))
            .reduce((sum, exp) => sum + exp.amount, 0);
        console.log(`[DEBUG] totalExpenses = €${total.toFixed(2)}`);
        return total;
    }, [expenses, selectedYear, getLatestYear]);

    // Total Income (Invoices + POS) – yearly
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

    // Cost of Goods Sold (COGS) – partial matching
    const costOfGoodsSold = useMemo(() => {
        // Normalize inventory items: trim, lowercase, store original name and cost
        const inventoryList = inventoryItems.map(item => ({
            name: (item.name || '').toLowerCase().trim(),
            cost: item.cost_per_unit,
        })).filter(item => item.name !== '');

        let totalCogs = 0;

        // Helper: find best matching inventory item for a given product name
        const findCostForProduct = (productName: string): number => {
            const normalized = productName.toLowerCase().trim();
            if (!normalized) return 0;

            // Try exact match first (fast)
            const exact = inventoryList.find(inv => inv.name === normalized);
            if (exact) return exact.cost;

            // Partial match: find any inventory name that is a substring of the product name
            const matches = inventoryList.filter(inv => normalized.includes(inv.name));
            if (matches.length > 0) {
                // Prefer the longest match (more specific)
                matches.sort((a, b) => b.name.length - a.name.length);
                return matches[0].cost;
            }

            // No match found
            console.log(`[DEBUG COGS] No inventory match for: ${productName}`);
            return 0;
        };

        // Process invoices
        invoices.forEach(invoice => {
            invoice.items.forEach(item => {
                const productName = (item.description || '').toLowerCase().trim();
                if (!productName) {
                    console.warn(`[DEBUG COGS] Invoice ${invoice.invoice_number} has empty product description, skipping.`);
                    return;
                }
                const quantity = item.quantity || 1;
                const cost = findCostForProduct(productName);
                const itemCogs = quantity * cost;

                if (cost > 0) {
                    console.log(`[DEBUG COGS] Invoice ${invoice.invoice_number} - ${productName}: ${quantity} × €${cost} = €${itemCogs.toFixed(2)}`);
                } else {
                    console.log(`[DEBUG COGS] No match for invoice product: ${productName} (cost = 0)`);
                }
                totalCogs += itemCogs;
            });
        });

        // Process POS transactions
        posTransactions.forEach(pos => {
            const productName = (pos.product_name || (pos as any).description || '').toLowerCase().trim();
            if (!productName) {
                console.warn(`[DEBUG COGS] POS transaction ${pos.id} has no product name or description, skipping.`);
                return;
            }
            const quantity = pos.quantity ?? 1;
            const cost = findCostForProduct(productName);
            const itemCogs = quantity * cost;

            if (cost > 0) {
                console.log(`[DEBUG COGS] POS ${pos.id} - ${productName}: ${quantity} × €${cost} = €${itemCogs.toFixed(2)}`);
            } else {
                console.log(`[DEBUG COGS] No match for POS product: ${productName} (cost = 0)`);
            }
            totalCogs += itemCogs;
        });

        console.log(`[DEBUG COGS] Total COGS = €${totalCogs.toFixed(2)}`);
        return totalCogs;
    }, [invoices, posTransactions, inventoryItems]);

    const displayProfit = displayIncome - costOfGoodsSold - totalExpenses;

    // Available years (from all transactions)
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