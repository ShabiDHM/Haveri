// FILE: src/hooks/useFinanceData.ts
// V17.5 – INTEGRATED WITH CENTRALIZED FISCAL CONTROLLER (CLEANED)

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFiscal } from './useFiscal';
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
    const { formatCurrency } = useFiscal();  // Only need formatCurrency for display
    
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [posTransactions, setPosTransactions] = useState<PosTransaction[]>([]);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsDashboardData | null>(null);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const workspaceId = options?.workspaceId;

    // REMOVED: Auto-sync that overrides user's selected year

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

    // Fetch all data (including inventory) - WITH YEAR FILTERING
    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            setLoading(true);
            try {
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

    // Total Expenses (yearly)
    const totalExpenses = useMemo(() => {
        const yearToUse = selectedYear;
        console.log(`[DEBUG] totalExpenses using year: ${yearToUse}`);
        const total = expenses
            .filter(e => Number(safeDate(e.date).getFullYear()) === Number(yearToUse))
            .reduce((sum, exp) => sum + toNumber(exp.amount), 0);
        console.log(`[DEBUG] totalExpenses = ${formatCurrency(total)}`);
        return total;
    }, [expenses, selectedYear, formatCurrency]);

    // Total Income (Invoices + POS) – yearly
    const displayIncome = useMemo(() => {
        const yearToUse = selectedYear;
        console.log(`[DEBUG] displayIncome using year: ${yearToUse}`);
        const invInc = invoices
            .filter(i => i.status === 'PAID' && Number(safeDate(i.issue_date).getFullYear()) === Number(yearToUse))
            .reduce((s, i) => s + toNumber(i.total_amount), 0);
        const posInc = posTransactions
            .filter(p => Number(safeDate(p.transaction_date).getFullYear()) === Number(yearToUse))
            .reduce((s, p) => s + toNumber(p.total_price), 0);
        const total = invInc + posInc;
        console.log(`[DEBUG] displayIncome = ${formatCurrency(total)}`);
        return total;
    }, [invoices, posTransactions, selectedYear, formatCurrency]);

    // Cost of Goods Sold (COGS) - ONLY for items with explicit inventory_item_id
    const costOfGoodsSold = useMemo(() => {
        const idMap = new Map<string, number>();
        inventoryItems.forEach(item => {
            const id = item._id;
            if (id) idMap.set(id, toNumber(item.cost_per_unit));
        });

        const getCostById = (id: string | undefined): number | null => {
            if (!id) return null;
            const cost = idMap.get(id);
            if (cost !== undefined) return cost;
            return null;
        };

        // Check if a description indicates a bank import or service
        const isBankOrServiceItem = (description: string): boolean => {
            const lowerDesc = description.toLowerCase();
            const bankKeywords = [
                'të hyra nga banka', 'bankë', 'transfertë', 'bank charge',
                'interest', 'loan payment', 'bank fee', 'shërbim bankar'
            ];
            const serviceKeywords = [
                'konsulencë', 'shërbim', 'consulting', 'service fee',
                'professional service', 'honorar'
            ];
            return bankKeywords.some(kw => lowerDesc.includes(kw)) ||
                   serviceKeywords.some(kw => lowerDesc.includes(kw));
        };

        let totalCogs = 0;
        let itemsProcessed = 0;
        let itemsSkipped = 0;

        // Process invoices - ONLY if inventory_item_id is explicitly set
        invoices.forEach(invoice => {
            if (!invoice.items || invoice.items.length === 0) return;
            invoice.items.forEach(item => {
                if (item.inventory_item_id) {
                    const cost = getCostById(item.inventory_item_id);
                    if (cost !== null) {
                        const quantity = toNumber(item.quantity);
                        const itemCogs = quantity * cost;
                        totalCogs += itemCogs;
                        itemsProcessed++;
                        console.log(`[DEBUG COGS] Invoice ${invoice.invoice_number} - item "${item.description}": ${quantity} × ${formatCurrency(cost)} = ${formatCurrency(itemCogs)}`);
                    } else {
                        console.warn(`[DEBUG COGS] Invoice ${invoice.invoice_number} - inventory_item_id "${item.inventory_item_id}" not found in inventory`);
                    }
                } else {
                    itemsSkipped++;
                    if (item.description && !isBankOrServiceItem(item.description)) {
                        console.log(`[DEBUG COGS] Skipping (no inventory_id): "${item.description}"`);
                    }
                }
            });
        });

        // Process POS transactions - ONLY if inventory_item_id is explicitly set
        posTransactions.forEach(pos => {
            if ((pos as any).inventory_item_id) {
                const cost = getCostById((pos as any).inventory_item_id);
                if (cost !== null) {
                    const quantity = toNumber(pos.quantity ?? 1);
                    const itemCogs = quantity * cost;
                    totalCogs += itemCogs;
                    itemsProcessed++;
                    console.log(`[DEBUG COGS] POS ${pos.id} - "${pos.product_name}": ${quantity} × ${formatCurrency(cost)} = ${formatCurrency(itemCogs)}`);
                } else {
                    console.warn(`[DEBUG COGS] POS ${pos.id} - inventory_item_id not found in inventory`);
                }
            } else {
                itemsSkipped++;
            }
        });

        console.log(`[DEBUG COGS] Processed: ${itemsProcessed} items with inventory_id, Skipped: ${itemsSkipped} items without inventory_id`);
        console.log(`[DEBUG COGS] Total COGS = ${formatCurrency(totalCogs)}`);
        return totalCogs;
    }, [invoices, posTransactions, inventoryItems, formatCurrency]);

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