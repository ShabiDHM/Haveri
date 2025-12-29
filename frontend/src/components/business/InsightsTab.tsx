// FILE: src/components/business/InsightsTab.tsx
// PHOENIX PROTOCOL - INSIGHTS TAB V1.2 (HEADER REMOVAL)
// 1. LAYOUT: Removed Hero Banner for immediate grid visibility.
// 2. SYMMETRY: Top alignment restored for 3-column layout.

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">
            
            {/* The Grid - Top Aligned */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-fr">
                
                {/* 1. Cash & Debt */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: 0.1 }}
                    className="h-full"
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