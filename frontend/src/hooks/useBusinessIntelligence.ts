// FILE: src/hooks/useBusinessIntelligence.ts
// PHOENIX PROTOCOL - BI ENGINE V1.7 (FIXED PARAMETER TYPE)

import { useMemo } from 'react';
import { useFinanceData } from './useFinanceData';
import { useInventoryData } from './useInventoryData';
import { useAuth } from '../context/AuthContext';
import { differenceInDays, parseISO, getYear } from 'date-fns';

export const useBusinessIntelligence = (workspaceId?: string) => {
    const { user, selectedYear } = useAuth();
    const { invoices, expenses, loading: financeLoading } = useFinanceData({ workspaceId });
    const { items, posItems, loading: inventoryLoading } = useInventoryData(workspaceId);

    const loading = financeLoading || inventoryLoading;
    const profile = user?.business_profile;
    const VAT_RATE = profile?.vat_rate ?? 18.0;

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

    const taxAnalytics = useMemo(() => {
        const taxCoefficient = VAT_RATE / (100 + VAT_RATE);
        const currentYear = new Date().getFullYear();
        const fiscalYear = selectedYear && selectedYear <= currentYear ? selectedYear : currentYear;
        const contextualInvoices = invoices.filter(i =>
            i.status !== 'CANCELLED' &&
            getYear(parseISO(i.issue_date)) === fiscalYear
        );
        const contextualExpenses = expenses.filter(e =>
            getYear(parseISO(e.date)) === fiscalYear
        );
        const totalSales = contextualInvoices.reduce((sum, i) => sum + i.total_amount, 0);
        const vatCollected = totalSales * taxCoefficient;
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
            contextYear: fiscalYear
        };
    }, [invoices, expenses, VAT_RATE, selectedYear]);

    return {
        loading,
        debtAnalytics,
        profitAnalytics,
        taxAnalytics
    };
};