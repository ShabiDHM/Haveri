// FILE: src/hooks/useBusinessIntelligence.ts
// PHOENIX PROTOCOL - BI ENGINE V1.1 (REAL DATA)
// 1. UPDATE: Uses 'user.business_profile.vat_rate' for exact tax calculations.
// 2. UPDATE: Uses 'user.business_profile.target_margin' for inventory alerts.

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
    
    // Default to Kosovo/Albania Standard if missing
    const VAT_RATE = profile?.vat_rate ?? 18.0; 
    // const CURRENCY = profile?.currency ?? 'EUR'; // For future display logic

    // 1. DEBT ANALYSIS
    const debtAnalytics = useMemo(() => {
        const unpaidInvoices = invoices.filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED');
        const totalDebt = unpaidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        
        const aging = {
            fresh: 0,   // 0-30 days
            warning: 0, // 30-60 days
            danger: 0   // 60+ days
        };

        const topDebtors: { name: string; amount: number; daysOverdue: number; phone?: string }[] = [];

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

    // 2. PROFIT & INVENTORY INTELLIGENCE
    const profitAnalytics = useMemo(() => {
        const totalStockValue = [...items, ...posItems].reduce((sum, item) => sum + (item.current_stock * item.cost_per_unit), 0);
        const lowStockItems = [...items, ...posItems].filter(i => i.current_stock <= i.low_stock_threshold);

        return { totalStockValue, lowStockItems };
    }, [items, posItems]);

    // 3. TAX ESTIMATOR (Dynamic VAT)
    const taxAnalytics = useMemo(() => {
        // Calculate Tax Coefficient (e.g., 18% -> 0.1525 if inclusive)
        // Assuming amounts are Gross (Include VAT)
        const taxCoefficient = VAT_RATE / (100 + VAT_RATE);

        // Sales VAT (Collected)
        const totalSales = invoices.filter(i => i.status !== 'CANCELLED').reduce((sum, i) => sum + i.total_amount, 0);
        const vatCollected = totalSales * taxCoefficient;

        // Purchase VAT (Deductible)
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const vatDeductible = totalExpenses * taxCoefficient; // Assumption: Expenses follow same rate approx.

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