// FILE: src/components/business/InsightsTab.tsx
// PHOENIX PROTOCOL - INSIGHTS TAB V1.1 (SYMMETRY FIX)
// 1. LAYOUT: Enforced 3-column grid on 'lg' screens to prevent orphan cards.
// 2. STYLE: Added h-full and auto-rows-fr to ensure perfect height alignment.

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, Sparkles } from 'lucide-react';
import { useBusinessIntelligence } from '../../hooks/useBusinessIntelligence';

// Modules
import { DebtModule } from './insights/DebtModule';
import { TaxModule } from './insights/TaxModule';
import { ProfitModule } from './insights/ProfitModule';

export const InsightsTab: React.FC = () => {
    const { t } = useTranslation();
    const { loading, debtAnalytics, profitAnalytics, taxAnalytics } = useBusinessIntelligence();

    if (loading) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-primary-start" /></div>;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 pb-10">
            
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-white/10 p-6 sm:p-10 text-center sm:text-left">
                <div className="absolute top-0 right-0 p-32 bg-primary-start/20 blur-[100px] rounded-full pointer-events-none" />
                <div className="relative z-10">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight flex items-center justify-center sm:justify-start gap-3">
                        <Sparkles className="text-amber-400 fill-amber-400" /> {t('insights.title', 'Inteligjenca e Biznesit')}
                    </h2>
                    <p className="text-gray-300 text-lg max-w-2xl">
                        {t('insights.subtitle', 'Analizë e thelluar për të marrë vendime më të zgjuara. Shihni ku po shkojnë paratë tuaja.')}
                    </p>
                </div>
            </div>

            {/* The Grid - Forced Symmetry */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-fr">
                
                {/* 1. Cash & Debt */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: 0.1 }}
                    className="h-full" // Ensures card stretches to match tallest sibling
                >
                    <DebtModule data={debtAnalytics} />
                </motion.div>

                {/* 2. Tax Estimator */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.2 }}
                    className="h-full"
                >
                    <TaxModule data={taxAnalytics} />
                </motion.div>

                {/* 3. Profit & Stock */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: 0.3 }}
                    className="h-full"
                >
                    <ProfitModule data={profitAnalytics} />
                </motion.div>

            </div>

            {/* Footer Advice */}
            <div className="text-center text-gray-500 text-sm mt-8 border-t border-white/5 pt-6">
                <p>💡 {t('insights.tip', 'Këshillë: Përdorni butonin WhatsApp tek borxhet për të përshpejtuar arkëtimin me 40%.')}</p>
            </div>

        </motion.div>
    );
};