import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react';

export const BusinessRhythmCard: React.FC = () => {
    const { t } = useTranslation();
    
    // TODO: Connect to Real-time API
    const currentSales = 420.50;
    const dailyTarget = 600.00;
    const progress = Math.min((currentSales / dailyTarget) * 100, 100);
    const isTrendingUp = true;

    return (
        <div className="bg-gray-900/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden h-full flex flex-col justify-between group hover:border-emerald-500/30 transition-colors duration-500">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full group-hover:bg-emerald-500/20 transition-all" />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" /> {t('dashboard.dailyRhythm', 'Ritmi i Ditës')}
                    </h3>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-bold text-white">€{currentSales.toFixed(2)}</span>
                        <span className="text-sm text-gray-500">/ €{dailyTarget}</span>
                    </div>
                </div>
                {/* Badge */}
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isTrendingUp ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {isTrendingUp ? '🔥 +15%' : '❄️ -5%'} {t('dashboard.vsAvg', 'vs Avg')}
                </div>
            </div>

            {/* Velocity Meter / Progress */}
            <div className="space-y-2 relative z-10">
                <div className="flex justify-between text-xs text-gray-400">
                    <span>{t('dashboard.progress', 'Progresi')} ({progress.toFixed(0)}%)</span>
                    <span>{t('dashboard.closingTime', 'Mbyllja: 22:00')}</span>
                </div>
                <div className="h-4 w-full bg-gray-800 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    {t('dashboard.onTrackMessage', 'Jeni në rrugë të mbarë për të tejkaluar objektivin ditor.')}
                </p>
            </div>
        </div>
    );
};