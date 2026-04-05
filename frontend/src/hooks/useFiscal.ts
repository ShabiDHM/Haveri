// FILE: src/hooks/useFiscal.ts
// PHOENIX PROTOCOL - CENTRALIZED FISCAL CONTROLLER

import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export interface FiscalConfig {
    vatRate: number;
    hasVat: boolean;
    currency: string;
    defaultMarginPercent: number;
}

export const useFiscal = () => {
    const { businessProfile } = useAuth();

    const fiscalConfig = useMemo<FiscalConfig>(() => {
        // VAT Rate - default to 0 (no tax) if not configured
        const vatRate = businessProfile?.vat_rate ?? 0;
        
        // Currency - default to EUR
        const currency = businessProfile?.currency ?? 'EUR';
        
        // Default margin for calculations (if business hasn't set one, use 30%)
        const defaultMarginPercent = businessProfile?.target_margin ?? 30;
        
        return {
            vatRate,
            hasVat: vatRate > 0,
            currency,
            defaultMarginPercent,
        };
    }, [businessProfile]);

    // Calculate selling price based on cost and margin
    const calculateSellingPrice = (cost: number, marginPercent?: number): number => {
        const margin = marginPercent ?? fiscalConfig.defaultMarginPercent;
        const markup = cost * (margin / 100);
        return cost + markup;
    };

    // Calculate VAT amount
    const calculateVatAmount = (amount: number, rate?: number): number => {
        const vatRate = rate ?? fiscalConfig.vatRate;
        return amount * (vatRate / 100);
    };

    // Calculate total including VAT
    const calculateTotalWithVat = (amount: number, includeVat: boolean, rate?: number): number => {
        if (!includeVat) return amount;
        return amount + calculateVatAmount(amount, rate);
    };

    // Format currency
    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('sq-AL', {
            style: 'currency',
            currency: fiscalConfig.currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    // Get tax rate for display
    const getTaxRateDisplay = (): string => {
        return fiscalConfig.vatRate > 0 ? `${fiscalConfig.vatRate}%` : '0% (Pa TVSH)';
    };

    // Get margin display
    const getMarginDisplay = (): string => {
        return `${fiscalConfig.defaultMarginPercent}%`;
    };

    return {
        config: fiscalConfig,
        calculateSellingPrice,
        calculateVatAmount,
        calculateTotalWithVat,
        formatCurrency,
        getTaxRateDisplay,
        getMarginDisplay,
        // Direct access to config values
        vatRate: fiscalConfig.vatRate,
        hasVat: fiscalConfig.hasVat,
        currency: fiscalConfig.currency,
        defaultMarginPercent: fiscalConfig.defaultMarginPercent,
    };
};

export default useFiscal;