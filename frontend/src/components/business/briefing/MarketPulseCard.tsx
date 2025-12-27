// FILE: src/components/business/briefing/MarketPulseCard.tsx
// PHOENIX PROTOCOL - MARKET PULSE V19.7 (LINT FIX)
// 1. CLEANUP: Removed unused icons (TrendingUp, Users).
// 2. STATUS: Clean build.

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Plane, CloudRain, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MarketPulseCard: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Mocking the "External Data" intelligence
    const marketSignals = [
        {
            id: 1,
            type: 'diaspora',
            icon: Plane,
            label: t('briefing.market.diaspora_label'),
            impact: 'high',
            message: t('briefing.market.diaspora_message'),
            action: t('briefing.market.diaspora_action'),
            target: '/business/inventory'
        },
        {
            id: 2,
            type: 'weather',
            icon: CloudRain,
            label: t('briefing.market.weather_label'),
            impact: 'medium',
            message: t('briefing.market.weather_message'),
            action: t('briefing.market.weather_action'),
            target: '/business/finance'
        }
    ];

    const handleAction = (target: string) => {
        navigate(target); 
    };

    return (
        <motion.div 
            whileHover={{ scale: 1.02 }}
            className="h-full bg-gradient-to-br from-gray-900/80 to-purple-900/20 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col relative overflow-hidden group"
        >
            <div className="flex items-center gap-3 mb-6 z-10">
                <div className="p-3 bg-purple-500/20 rounded-2xl">
                    <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-lg">{t('briefing.market.title')}</h3>
                    <p className="text-gray-400 text-xs">{t('briefing.market.subtitle')}</p>
                </div>
            </div>

            <div className="space-y-3 flex-1 z-10">
                {marketSignals.map((signal) => (
                    <div key={signal.id} className="bg-gray-800/50 hover:bg-gray-800 transition-colors rounded-xl p-3 border border-white/5 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${signal.impact === 'high' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                            <signal.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-gray-200 text-sm font-semibold">{signal.label}</h4>
                            <p className="text-gray-400 text-[10px] leading-tight">{signal.message}</p>
                        </div>
                        <div className="text-right">
                             <button 
                                onClick={() => handleAction(signal.target)}
                                className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md border border-purple-500/20 hover:bg-purple-500/20 transition-colors cursor-pointer"
                             >
                                {signal.action}
                             </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 z-10">
                <button 
                    onClick={() => navigate('/business/insights')}
                    className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-medium text-gray-300 flex items-center justify-center gap-2 transition-all"
                >
                    {t('briefing.market.analyze_competitors')} <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
};