import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Wallet, ArrowUpRight, AlertCircle, Banknote } from 'lucide-react';

export const LiquiditySentinelCard: React.FC = () => {
    const { t } = useTranslation();

    // Mock logic - strictly for UI demonstration until Backend integrates "Liquidity"
    const liquidityData = {
        daysRunway: 24,
        cashOnHand: 1250,
        pendingDebts: 3400,
        upcomingBills: 2100
    };

    const isHealthy = liquidityData.daysRunway > 20;

    return (
        <motion.div 
            whileHover={{ scale: 1.02 }}
            className="h-full bg-gray-900/50 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-500"
        >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 p-20 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-indigo-500/20 transition-all" />

            <div className="flex justify-between items-start z-10">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-500/20 rounded-2xl">
                        <Wallet className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg">{t('briefing.liquidity.title')}</h3>
                        <p className="text-gray-400 text-xs">{t('briefing.liquidity.subtitle')}</p>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isHealthy ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {liquidityData.daysRunway} {t('briefing.liquidity.days_runway')}
                </div>
            </div>

            <div className="space-y-4 mt-6 z-10">
                {/* Visual Bar Graph Logic */}
                <div className="relative pt-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                        <span>{t('briefing.liquidity.bills')}</span>
                        <span>{t('briefing.liquidity.balance')}</span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex">
                        <div className="h-full bg-red-500/50 w-[35%]" /> {/* Bills Visualization */}
                        <div className="h-full bg-emerald-500 w-[65%]" /> {/* Cash Visualization */}
                    </div>
                    <div className="flex justify-between text-xs font-mono mt-2">
                        <span className="text-red-300">-€{liquidityData.upcomingBills}</span>
                        <span className="text-emerald-300">+€{liquidityData.cashOnHand}</span>
                    </div>
                </div>

                {/* The "Kosovo" Factor: Debt Collection */}
                <div className="bg-gray-800/40 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Banknote className="w-5 h-5 text-amber-400" />
                        <div>
                            <p className="text-gray-300 text-sm font-medium">{t('briefing.liquidity.debt_title')}</p>
                            <p className="text-amber-400 text-xs font-bold">€{liquidityData.pendingDebts} {t('briefing.liquidity.debt_status')}</p>
                        </div>
                    </div>
                    <button className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors" aria-label={t('briefing.liquidity.collect_action')}>
                        <ArrowUpRight className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 z-10">
                <p className="text-xs text-gray-400 flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 text-indigo-400" />
                    {t('briefing.liquidity.suggestion')}
                </p>
            </div>
        </motion.div>
    );
};