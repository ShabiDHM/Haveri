// FILE: src/hooks/useFinanceData.ts
// V17.11 – REMOVED POS DOUBLE-COUNTING FROM COGS

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

const toNumber = (val: any): number => {
    if (typeof val === 'number' && !isNaN(val)) return val;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
};

export const useFinanceData = (options?: UseFinanceDataOptions) => {
    const { selectedYear, setSelectedYear, businessProfile } = useAuth();
    const { formatCurrency, defaultMarginPercent } = useFiscal();
    
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [posTransactions, setPosTransactions] = useState<PosTransaction[]>([]);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsDashboardData | null>(null);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const workspaceId = options?.workspaceId;

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

    const totalExpensesRaw = useMemo(() => {
        const yearToUse = selectedYear;
        const total = expenses
            .filter(e => Number(safeDate(e.date).getFullYear()) === Number(yearToUse))
            .reduce((sum, exp) => sum + toNumber(exp.amount), 0);
        return total;
    }, [expenses, selectedYear]);

    const displayIncome = useMemo(() => {
        const yearToUse = selectedYear;
        const invInc = invoices
            .filter(i => i.status === 'PAID' && Number(safeDate(i.issue_date).getFullYear()) === Number(yearToUse))
            .reduce((s, i) => s + toNumber(i.total_amount), 0);
        const posInc = posTransactions
            .filter(p => Number(safeDate(p.transaction_date).getFullYear()) === Number(yearToUse))
            .reduce((s, p) => s + toNumber(p.total_price), 0);
        return invInc + posInc;
    }, [invoices, posTransactions, selectedYear]);

    // PHOENIX: COGS from invoices ONLY (POS transactions already have invoices)
    const costOfGoodsSold = useMemo(() => {
        const idMap = new Map<string, number>();
        const nameMap = new Map<string, number>();
        
        inventoryItems.forEach(item => {
            const id = item._id;
            if (id) idMap.set(id, toNumber(item.cost_per_unit));
            const name = (item.name || '').toLowerCase().trim();
            if (name) nameMap.set(name, toNumber(item.cost_per_unit));
        });

        const getCostById = (id: string | undefined): number | null => {
            if (!id) return null;
            const cost = idMap.get(id);
            return cost !== undefined ? cost : null;
        };

        const getCostByName = (name: string, salePrice: number): number => {
            const normalized = name.toLowerCase().trim();
            if (!normalized) return 0;

            if (nameMap.has(normalized)) {
                return nameMap.get(normalized)!;
            }

            const match = inventoryItems.find(inv => {
                const invName = (inv.name || '').toLowerCase().trim();
                return normalized.includes(invName) || invName.includes(normalized);
            });

            if (match) {
                console.log(`[DEBUG COGS] Fuzzy match: "${name}" -> "${match.name}" (cost: ${match.cost_per_unit})`);
                return toNumber(match.cost_per_unit);
            }

            const marginPercent = businessProfile?.target_margin ?? defaultMarginPercent ?? 30;
            const derivedCost = salePrice / (1 + (marginPercent / 100));
            
            console.log(`[DEBUG COGS] No inventory match for "${name}". Sale: €${salePrice.toFixed(2)}, Margin: ${marginPercent}%. Derived cost: €${derivedCost.toFixed(2)}`);
            
            return derivedCost;
        };

        let totalCogs = 0;
        let linkedCount = 0;
        let derivedCount = 0;

        // Process invoices ONLY (POS transactions already have invoices)
        invoices.forEach(invoice => {
            if (!invoice.items || invoice.items.length === 0) return;
            invoice.items.forEach(item => {
                let cost = 0;
                const salePrice = toNumber(item.unit_price);
                
                if (item.inventory_item_id) {
                    const c = getCostById(item.inventory_item_id);
                    if (c !== null) {
                        cost = c;
                        linkedCount++;
                    } else {
                        cost = getCostByName(item.description || '', salePrice);
                        derivedCount++;
                    }
                } else {
                    cost = getCostByName(item.description || '', salePrice);
                    derivedCount++;
                }
                
                const quantity = toNumber(item.quantity);
                const itemCogs = quantity * cost;
                totalCogs += itemCogs;
                
                if (cost > 0) {
                    console.log(`[DEBUG COGS] Invoice ${invoice.invoice_number} - "${item.description}": ${quantity} × €${cost.toFixed(2)} = €${itemCogs.toFixed(2)}`);
                }
            });
        });

        // POS transactions are SKIPPED because they already have invoices
        // Do NOT process posTransactions here

        const cogsCategories = ['mall', 'stock', 'inventory', 'blerje', 'furnizim', 'cogs', 'raw_material'];
        
        expenses.forEach(exp => {
            const category = (exp.category || '').toLowerCase();
            const isCogsCategory = cogsCategories.some(cat => category.includes(cat));
            
            if (isCogsCategory) {
                const amount = toNumber(exp.amount);
                totalCogs += amount;
                console.log(`[DEBUG COGS] Expense recognized as COGS: "${exp.description}" (${exp.category}) = €${amount.toFixed(2)}`);
            }
        });

        console.log(`[DEBUG COGS] Summary: ${linkedCount} linked items, ${derivedCount} derived from margin. Total COGS = ${formatCurrency(totalCogs)}`);
        return totalCogs;
    }, [invoices, expenses, inventoryItems, businessProfile, defaultMarginPercent, formatCurrency]);

    // PHOENIX: Calculate adjusted expenses (remove COGS expenses from total for display)
    const cogsCategories = useMemo(() => ['mall', 'stock', 'inventory', 'blerje', 'furnizim', 'cogs', 'raw_material'], []);
    
    const adjustedExpenses = useMemo(() => {
        let adjusted = totalExpensesRaw;
        expenses.forEach(exp => {
            const category = (exp.category || '').toLowerCase();
            if (cogsCategories.some(cat => category.includes(cat))) {
                adjusted -= exp.amount;
            }
        });
        return adjusted;
    }, [expenses, totalExpensesRaw, cogsCategories]);

    const displayProfit = displayIncome - costOfGoodsSold - adjustedExpenses;

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
        totalExpenses: adjustedExpenses,
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