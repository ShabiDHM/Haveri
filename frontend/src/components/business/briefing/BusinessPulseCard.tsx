// FILE: src/components/business/briefing/BusinessPulseCard.tsx
// PHOENIX PROTOCOL - PULSE CARD V2.3 (NO DATA UI)
// 1. UI: Displays an "insufficient data" message when peakTime is null.
// 2. LOGIC: Conditionally renders the forecast or the placeholder text.

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, TrendingUp, Zap, Clock } from 'lucide-react';
import { apiService } from '../../../services/api';

interface Signal {
    id: number;
    type: string;
    label: string;
    message: string;
}

interface BusinessPulseCardProps {
    signals?: Signal[];
    currentSales?: number;
    peakTime?: string | null; // Allow null for "no data" state
}

export const BusinessPulseCard: React.FC<BusinessPulseCardProps> = ({ 
    signals = [], 
    currentSales = 0,
    peakTime = null
}) => {
    const { t } = useTranslation();
    const [insight, setInsight] = useState<string>("");
    
    const projection = useMemo(() => {
        const now = new Date();
        const startHour = 8, endHour = 22;
        const currentHour = now.getHours() + (now.getMinutes() / 60);
        
        if (currentHour <= startHour || currentHour >= endHour) return currentSales;

        const hoursPassed = currentHour - startHour;
        const velocityPerHour = currentSales / hoursPassed;
        const remainingHours = endHour - currentHour;
        return currentSales + (velocityPerHour * remainingHours);
    }, [currentSales]);

    useEffect(() => {
        const fetchInsight = async () => {
            try {
                const data = await apiService.getProactiveInsight();
                setInsight(data.insight);
            } catch (e) {
                setInsight(t('dashboard.pulse.analyzing', 'Duke analizuar të dhënat...'));
            }
        };
        fetchInsight();
    }, [t]);

    const hotItem = useMemo(() => signals.find(s => s.type === 'bestseller'), [signals]);

    return (
        <div className="bg-gray-900/50 border border-white/10 rounded-3xl p-6 h-full flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px] animate-pulse" />
            <div className="flex justify-between items-start mb-6 relative z-10">
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" /> {t('dashboard.pulse.title', 'Pulsi i Biznesit')}
                </h3>
                <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
            </div>
            <div className="flex-1 space-y-6 relative z-10">
                <div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-black text-white tracking-tight">€{projection.toFixed(0)}</h2>
                        <span className="text-xs text-gray-500 font-medium uppercase">{t('dashboard.pulse.eodForecast', 'Parashikimi EOD')}</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min((currentSales / (projection || 1)) * 100, 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                        <Zap size={12} className="text-yellow-400" /> 
                        {t('dashboard.pulse.basedOnVelocity', 'Bazuar në ritmin aktual')}
                    </p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 backdrop-blur-sm">
                    {hotItem ? (
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400 shrink-0"><TrendingUp size={16} /></div>
                            <div>
                                <p className="text-xs text-rose-300 font-bold uppercase mb-1">{t('dashboard.pulse.alertTrend', 'Trend në Rritje')}</p>
                                <p className="text-sm text-gray-200 leading-snug">"{hotItem.label}" {t('dashboard.pulse.sellingFast', 'po shitet me shpejtësi.')}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 shrink-0"><Clock size={16} /></div>
                            <div>
                                <p className="text-xs text-blue-300 font-bold uppercase mb-1">{t('dashboard.pulse.trafficAnalysis', 'Analiza e Trafikut')}</p>
                                {peakTime ? (
                                    <p className="text-sm text-gray-200 leading-snug">
                                        {t('dashboard.pulse.trafficHigh', 'Pritet fluks i lartë:')} <span className="text-white font-bold">{peakTime}</span>.
                                    </p>
                                ) : (
                                    <p className="text-sm text-gray-400 italic leading-snug">
                                        {t('dashboard.pulse.insufficientData', 'Të dhëna të pamjaftueshme për parashikim.')}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="pt-2 border-t border-white/5">
                    <p className="text-xs text-gray-500 italic flex gap-2">
                        <span className="font-bold text-indigo-400">AI:</span> 
                        {insight || t('dashboard.pulse.monitoring', 'Duke monitoruar...')}
                    </p>
                </div>
            </div>
        </div>
    );
};