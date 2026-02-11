// FILE: src/hooks/useBusinessIntelligence.ts
// PHOENIX PROTOCOL - BI ENGINE V1.4 (HYBRID CONTEXT SYNC)
// 1. FIXED: Tax Estimator now respects 'selectedYear' for contextual accuracy.
// 2. LOGIC: Debt and Stock Value remain Global to reflect total business liability.
// 3. STATUS: Intelligence Engine fully synchronized with Fiscal Context.

import { useMemo } from 'react';
import { useFinanceData } from './useFinanceData';
import { useInventoryData } from './useInventoryData';
import { useAuth } from '../context/AuthContext';
import { differenceInDays, parseISO, getYear } from 'date-fns';

export const useBusinessIntelligence = () => {
    const { user, selectedYear } = useAuth();
    const { invoices, expenses, loading: financeLoading } = useFinanceData();
    const { items, posItems, loading: inventoryLoading } = useInventoryData();

    const loading = financeLoading || inventoryLoading;
    const profile = user?.business_profile;
    
    // Default to Kosovo/Albania Standard (18.0)
    const VAT_RATE = profile?.vat_rate ?? 18.0; 

    // 1. DEBT ANALYSIS (GLOBAL CONTEXT)
    // PHOENIX: Debt is a persistent reality. We keep this all-time.
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

    // 2. PROFIT & INVENTORY INTELLIGENCE (GLOBAL CONTEXT)
    // PHOENIX: Current stock value is an absolute state.
    const profitAnalytics = useMemo(() => {
        const combinedItems = [...items, ...posItems];
        const uniqueItemsMap = new Map();
        
        combinedItems.forEach(item => {
            if (!uniqueItemsMap.has(item.name)) {
                uniqueItemsMap.set(item.name, { ...item });
            } else {
                const existing = uniqueItemsMap.get(item.name);
                existing.current_stock += item.current_stock;
            }
        });

        const uniqueItems = Array.from(uniqueItemsMap.values());
        const totalStockValue = uniqueItems.reduce((sum, item) => sum + (item.current_stock * item.cost_per_unit), 0);
        
        const lowStockItems = uniqueItems.filter(i => {
            const current = Number(i.current_stock);
            const threshold = Number(i.low_stock_threshold ?? 0);
            return current <= threshold;
        });

        return { totalStockValue, lowStockItems };
    }, [items, posItems]);

    // 3. TAX ESTIMATOR (FISCAL CONTEXT AWARE)
    // PHOENIX: Tax obligations are strictly tied to the selected Fiscal Year.
    const taxAnalytics = useMemo(() => {
        const taxCoefficient = VAT_RATE / (100 + VAT_RATE);

        // Filter Sales and Expenses by the selected year
        const contextualInvoices = invoices.filter(i => 
            i.status !== 'CANCELLED' && 
            getYear(parseISO(i.issue_date)) === selectedYear
        );

        const contextualExpenses = expenses.filter(e => 
            getYear(parseISO(e.date)) === selectedYear
        );

        // Sales VAT (Output Tax)
        const totalSales = contextualInvoices.reduce((sum, i) => sum + i.total_amount, 0);
        const vatCollected = totalSales * taxCoefficient;

        // Purchase VAT (Input Tax - Smart Filter)
        const deductibleExpenses = contextualExpenses.filter(e => {
            const cat = e.category.toLowerCase();
            return !cat.includes('rrog') && !cat.includes('pag') && !cat.includes('salary');
        });

        const totalDeductibleAmount = deductibleExpenses.reduce((sum, e) => sum + e.amount, 0);
        const vatDeductible = totalDeductibleAmount * taxCoefficient;

        const estimatedLiability = vatCollected - vatDeductible;

        return { 
            vatCollected, 
            vatDeductible, 
            estimatedLiability, 
            effectiveRate: VAT_RATE,
            contextYear: selectedYear 
        };
    }, [invoices, expenses, VAT_RATE, selectedYear]);

    return {
        loading,
        debtAnalytics,
        profitAnalytics,
        taxAnalytics
    };
};