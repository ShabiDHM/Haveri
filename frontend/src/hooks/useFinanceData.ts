// FILE: src/hooks/useFinanceData.ts
// V16 – ADDED YEAR FILTER TO API CALLS

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

// Helper to safely convert to number
const toNumber = (val: any): number => {
    if (typeof val === 'number' && !isNaN(val)) return val;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
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
            amount: toNumber(inv.total_amount),
            label: inv.invoice_number || `Invoice ${inv.id.slice(0, 8)}`,
            raw: inv,
        }));
        const expenseItems: TransactionItem[] = expenses.map(exp => ({
            id: exp.id,
            type: 'expense',
            date: exp.date,
            amount: toNumber(exp.amount),
            label: exp.category || exp.description || `Expense ${exp.id.slice(0, 8)}`,
            raw: exp,
        }));
        const posItems: TransactionItem[] = posTransactions.map(pos => ({
            id: pos.id,
            type: 'pos',
            date: pos.transaction_date,
            amount: toNumber(pos.total_price),
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

    // Fetch all data (including inventory) - NOW WITH YEAR FILTERING
    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            setLoading(true);
            try {
                // PHOENIX: Pass selectedYear to API calls for proper filtering
                const results = await Promise.allSettled([
                    apiService.getInvoices(workspaceId, selectedYear),
                    apiService.getExpenses(workspaceId, selectedYear),
                    apiService.getWorkspaces(),
                    apiService.getPosTransactions(workspaceId, selectedYear),
                    apiService.getAnalyticsDashboard(undefined, selectedYear, workspaceId),
                    apiService.getInventoryItems(workspaceId),
                ]);
                console.log('[useFinanceData] Raw API responses for year:', selectedYear);
                if (results[0].status === 'fulfilled') {
                    console.log('  Invoices:', results[0].value.length);
                    setInvoices(results[0].value);
                } else console.error('  Invoices fetch failed:', results[0].reason);
                if (results[1].status === 'fulfilled') {
                    console.log('  Expenses:', results[1].value.length);
                    setExpenses(results[1].value);
                } else console.error('  Expenses fetch failed:', results[1].reason);
                if (results[2].status === 'fulfilled') {
                    console.log('  Workspaces:', results[2].value);
                    setWorkspaces(results[2].value);
                } else console.error('  Workspaces fetch failed:', results[2].reason);
                if (results[3].status === 'fulfilled') {
                    console.log('  POS Transactions:', results[3].value.length);
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
        // PHOENIX: Pass selectedYear to API calls for proper filtering
        const [inv, exp, pos, analytics, inventory] = await Promise.all([
            apiService.getInvoices(workspaceId, selectedYear),
            apiService.getExpenses(workspaceId, selectedYear),
            apiService.getPosTransactions(workspaceId, selectedYear),
            apiService.getAnalyticsDashboard(undefined, selectedYear, workspaceId),
            apiService.getInventoryItems(workspaceId),
        ]);
        setInvoices(inv);
        setExpenses(exp);
        setPosTransactions(pos);
        setAnalyticsData(analytics);
        setInventoryItems(inventory);
    }, [selectedYear, workspaceId]);

    // Total Expenses (yearly) - NOW FILTERED BY API, but keep client-side filter as safety
    const totalExpenses = useMemo(() => {
        const yearToUse = selectedYear ?? getLatestYear();
        console.log(`[DEBUG] totalExpenses using year: ${yearToUse}`);
        const total = expenses
            .filter(e => Number(safeDate(e.date).getFullYear()) === Number(yearToUse))
            .reduce((sum, exp) => sum + toNumber(exp.amount), 0);
        console.log(`[DEBUG] totalExpenses = €${total.toFixed(2)}`);
        return total;
    }, [expenses, selectedYear, getLatestYear]);

    // Total Income (Invoices + POS) – yearly - NOW FILTERED BY API, but keep client-side filter as safety
    const displayIncome = useMemo(() => {
        const yearToUse = selectedYear ?? getLatestYear();
        console.log(`[DEBUG] displayIncome using year: ${yearToUse}`);
        const invInc = invoices
            .filter(i => i.status === 'PAID' && Number(safeDate(i.issue_date).getFullYear()) === Number(yearToUse))
            .reduce((s, i) => s + toNumber(i.total_amount), 0);
        const posInc = posTransactions
            .filter(p => Number(safeDate(p.transaction_date).getFullYear()) === Number(yearToUse))
            .reduce((s, p) => s + toNumber(p.total_price), 0);
        const total = invInc + posInc;
        console.log(`[DEBUG] displayIncome = €${total.toFixed(2)}`);
        return total;
    }, [invoices, posTransactions, selectedYear, getLatestYear]);

    // Cost of Goods Sold (COGS) – uses inventory_item_id if present, else fuzzy name match
    const costOfGoodsSold = useMemo(() => {
        // Build maps for fast lookup
        const idMap = new Map<string, number>();
        const nameMap = new Map<string, number>();
        inventoryItems.forEach(item => {
            const id = item._id;
            if (id) idMap.set(id, toNumber(item.cost_per_unit));
            const name = (item.name || '').toLowerCase().trim();
            if (name) nameMap.set(name, toNumber(item.cost_per_unit));
        });

        const loggedMissing = new Set<string>();

        const getCostById = (id: string | undefined): number | null => {
            if (!id) return null;
            const cost = idMap.get(id);
            if (cost !== undefined) return cost;
            return null;
        };

        const getCostByName = (name: string): number => {
            const normalized = name.toLowerCase().trim();
            if (!normalized) return 0;

            // Exact match
            if (nameMap.has(normalized)) return nameMap.get(normalized)!;

            // Fuzzy match (substring)
            const match = inventoryItems.find(inv => {
                const invName = (inv.name || '').toLowerCase().trim();
                return normalized.includes(invName);
            });
            if (match) return toNumber(match.cost_per_unit);

            // Log missing once
            if (!loggedMissing.has(normalized)) {
                loggedMissing.add(normalized);
                console.log(`[DEBUG COGS] No inventory match for product: ${name}`);
            }
            return 0;
        };

        let totalCogs = 0;

        // Process invoices
        invoices.forEach(invoice => {
            if (!invoice.items || invoice.items.length === 0) return;
            invoice.items.forEach(item => {
                let cost = 0;
                // Priority 1: use inventory_item_id if present
                if (item.inventory_item_id) {
                    const c = getCostById(item.inventory_item_id);
                    if (c !== null) cost = c;
                }
                // Fallback: use description (name) matching
                if (cost === 0 && item.description) {
                    cost = getCostByName(item.description);
                }
                const quantity = toNumber(item.quantity);
                const itemCogs = quantity * cost;
                if (cost > 0) {
                    console.log(`[DEBUG COGS] Invoice ${invoice.invoice_number} - line item "${item.description}": ${quantity} × €${cost} = €${itemCogs.toFixed(2)}`);
                }
                totalCogs += itemCogs;
            });
        });

        // Process POS transactions
        posTransactions.forEach(pos => {
            let cost = 0;
            // Priority 1: use inventory_item_id if present
            if ((pos as any).inventory_item_id) {
                const c = getCostById((pos as any).inventory_item_id);
                if (c !== null) cost = c;
            }
            // Fallback: use product_name (or description)
            if (cost === 0) {
                const productName = (pos.product_name || (pos as any).description || '').trim();
                if (productName) {
                    cost = getCostByName(productName);
                }
            }
            const quantity = toNumber(pos.quantity ?? 1);
            const itemCogs = quantity * cost;
            if (cost > 0) {
                console.log(`[DEBUG COGS] POS ${pos.id} - "${pos.product_name}": ${quantity} × €${cost} = €${itemCogs.toFixed(2)}`);
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