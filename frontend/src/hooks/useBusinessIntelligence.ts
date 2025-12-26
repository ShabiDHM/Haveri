// FILE: src/hooks/useBusinessIntelligence.ts
// PHOENIX PROTOCOL - BI ENGINE V1.2 (DEDUPLICATION & SMART TAX)
// 1. FIX: Deduplicates inventory items by name to prevent double listings.
// 2. LOGIC: Excludes 'Salaries' (Rrogat) from VAT deduction automatically.
// 3. STATUS: Production Ready.

import { useMemo } from 'react';
import { useFinanceData } from './useFinanceData';
import { useInventoryData } from './useInventoryData';
import { useAuth } from '../context/AuthContext';
import { differenceInDays, parseISO } from 'date-fns';

export const useBusinessIntelligence = () => {
    const { user } = useAuth();
    const { invoices, expenses, loading: financeLoading } = useFinanceData();
    const { items, posItems, loading: inventoryLoading } = useInventoryData();

    const loading = financeLoading || inventoryLoading;
    const profile = user?.business_profile;
    
    // Default to Kosovo/Albania Standard
    const VAT_RATE = profile?.vat_rate ?? 18.0; 

    // 1. DEBT ANALYSIS
    const debtAnalytics = useMemo(() => {
        const unpaidInvoices = invoices.filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED');
        const totalDebt = unpaidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        
        const aging = { fresh: 0, warning: 0, danger: 0 };
        const topDebtors: any[] = [];

        unpaidInvoices.forEach(inv => {
            const days = differenceInDays(new Date(), parseISO(inv.issue_date));
            if (days <= 30) aging.fresh += inv.total_amount;
            else if (days <= 60) aging.warning += inv.total_amount;
            else aging.danger += inv.total_amount;

            topDebtors.push({
                name: inv.client_name,
                amount: inv.total_amount,
                daysOverdue: days,
                phone: (inv as any).client_phone
            });
        });

        topDebtors.sort((a, b) => b.amount - a.amount);
        return { totalDebt, aging, topDebtors: topDebtors.slice(0, 5) };
    }, [invoices]);

    // 2. PROFIT & INVENTORY INTELLIGENCE (DEDUPLICATED)
    const profitAnalytics = useMemo(() => {
        // Merge and Deduplicate by Name
        const combinedItems = [...items, ...posItems];
        const uniqueItemsMap = new Map();
        
        combinedItems.forEach(item => {
            if (!uniqueItemsMap.has(item.name)) {
                uniqueItemsMap.set(item.name, item);
            } else {
                // If duplicate, aggregate stock (optional, but safer to just take one for now)
                const existing = uniqueItemsMap.get(item.name);
                existing.current_stock += item.current_stock; // Merge stock count
            }
        });

        const uniqueItems = Array.from(uniqueItemsMap.values());

        const totalStockValue = uniqueItems.reduce((sum, item) => sum + (item.current_stock * item.cost_per_unit), 0);
        const lowStockItems = uniqueItems.filter(i => i.current_stock <= i.low_stock_threshold);

        return { totalStockValue, lowStockItems };
    }, [items, posItems]);

    // 3. TAX ESTIMATOR (SMART VAT)
    const taxAnalytics = useMemo(() => {
        const taxCoefficient = VAT_RATE / (100 + VAT_RATE);

        // Sales VAT
        const totalSales = invoices.filter(i => i.status !== 'CANCELLED').reduce((sum, i) => sum + i.total_amount, 0);
        const vatCollected = totalSales * taxCoefficient;

        // Purchase VAT (Smart Filter)
        // Exclude categories like 'Paga', 'Rrogat', 'Salaries' from VAT deduction
        const deductibleExpenses = expenses.filter(e => {
            const cat = e.category.toLowerCase();
            return !cat.includes('rrog') && !cat.includes('pag') && !cat.includes('salary');
        });

        const totalDeductibleAmount = deductibleExpenses.reduce((sum, e) => sum + e.amount, 0);
        const vatDeductible = totalDeductibleAmount * taxCoefficient;

        const estimatedLiability = vatCollected - vatDeductible;

        return { vatCollected, vatDeductible, estimatedLiability, effectiveRate: VAT_RATE };
    }, [invoices, expenses, VAT_RATE]);

    return {
        loading,
        debtAnalytics,
        profitAnalytics,
        taxAnalytics
    };
};