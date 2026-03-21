// FILE: src/components/business/briefing/BusinessPulseCard.tsx
// PHOENIX PROTOCOL - PULSE CARD V5.0 (CONSISTENT TYPOGRAPHY)
// 1. FIXED: Filtered out static "Sistemi aktiv..." message from AI Insight.
// 2. FIXED: Made AI Insight rendering conditional on meaningful content.
// 3. UPDATED: Uses new design system CSS variables for light/dark theme compatibility.
// 4. TYPOGRAPHY: Standardized text sizes (removed text-[10px], text-[11px])
// 5. STATUS: UI Insight Redundancy Resolved.

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, TrendingUp, Zap, Clock, Info, Coffee } from 'lucide-react';
import { motion } from 'framer-motion';
import { isWeekend } from 'date-fns';
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
    peakTime?: string | null;
}

export const BusinessPulseCard: React.FC<BusinessPulseCardProps> = ({ 
    signals = [], 
    currentSales = 0,
    peakTime = null
}) => {
    const { t } = useTranslation();
    const [insight, setInsight] = useState<string>("");
    
    const now = new Date();
    const isRestDay = isWeekend(now);

    const projection = useMemo(() => {
        const startHour = 8, endHour = 22, totalHours = endHour - startHour;
        const currentHour = now.getHours() + (now.getMinutes() / 60);
        
        if (currentHour <= startHour) return 0;
        if (currentHour >= endHour) return currentSales;

        const hoursPassed = currentHour - startHour;
        const velocity = currentSales / hoursPassed;
        
        const confidenceWeight = Math.min(hoursPassed / (totalHours * 0.5), 1);
        const projectedRemaining = velocity * (endHour - currentHour);
        
        return currentSales + (projectedRemaining * confidenceWeight);
    }, [currentSales, now]);

    useEffect(() => {
        const fetchInsight = async () => {
            try {
                const data = await apiService.getProactiveInsight();
                if (data.insight === "Sistemi aktiv dhe i monitoruar në kohë reale.") {
                    setInsight("");
                } else {
                    setInsight(data.insight);
                }
            } catch (e) {
                if (isRestDay) {
                    setInsight("Është fundjavë. Shfrytëzoni kohën për mbyllje të suksesshme të javës dhe planifikim.");
                } else {
                    setInsight(t('dashboard.pulse.analyzing', 'Duke analizuar ritmin e tregut...'));
                }
            }
        };
        fetchInsight();
    }, [t, isRestDay]);

    const hotItem = useMemo(() => signals.find(s => s.type === 'bestseller'), [signals]);

    return (
        <div className="bg-surface/50 border border-border-main rounded-3xl p-6 h-full flex flex-col relative overflow-hidden group shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] group-hover:bg-primary/10 transition-colors" />
            
            <div className="flex justify-between items-start mb-6 relative z-10">
                <h3 className="text-text-muted text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> {t('dashboard.pulse.title', 'Pulsi i Biznesit')}
                </h3>
                <span className="flex h-3 w-3 relative">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRestDay ? 'bg-primary' : 'bg-success-start'}`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${isRestDay ? 'bg-primary' : 'bg-success-start'}`}></span>
                </span>
            </div>

            <div className="flex-1 space-y-6 relative z-10">
                <div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-black text-text-primary tracking-tighter">
                            €{projection.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </h2>
                        <span className="text-xs text-text-muted font-semibold uppercase tracking-wide">
                            {t('dashboard.pulse.eodForecast', 'Parashikimi mbylljes')}
                        </span>
                    </div>
                    <div className="mt-3 h-1.5 w-full bg-border-main rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((currentSales / (projection || 1)) * 100, 100)}%` }}
                            className="h-full bg-gradient-to-r from-primary to-primary rounded-full"
                        />
                    </div>
                    <p className="text-xs text-text-muted mt-2 flex items-center gap-1.5 font-medium">
                        <Zap size={12} className="text-warning-start" /> 
                        {isRestDay ? "Ritmi i ditëve të pushimit (Vikend)" : t('dashboard.pulse.basedOnVelocity', 'Bazuar në ritmin aktual')}
                    </p>
                </div>

                <div className="bg-surface border border-border-main rounded-2xl p-4 backdrop-blur-md">
                    {hotItem ? (
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-danger/10 rounded-xl text-danger"><TrendingUp size={16} /></div>
                            <div>
                                <p className="text-xs text-danger font-bold uppercase mb-1">Trendi Hot</p>
                                <p className="text-sm text-text-secondary leading-snug font-medium">"{hotItem.label}" po kërkohet shumë.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                {isRestDay ? <Coffee size={16} /> : <Clock size={16} />}
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-primary font-bold uppercase mb-1">
                                    {isRestDay ? "Sygjerim për Vikend" : t('dashboard.pulse.trafficAnalysis', 'Analiza e Trafikut')}
                                </p>
                                {peakTime ? (
                                    <p className="text-sm text-text-secondary leading-snug font-medium">
                                        Fluks i lartë pritet rreth orës: <span className="text-text-primary">{peakTime}</span>.
                                    </p>
                                ) : (
                                    <p className="text-xs text-text-muted italic leading-relaxed">
                                        {isRestDay 
                                            ? "Fundjavat zakonisht kanë fluks më të ulët. Fokusohuni në rishikimin e javës."
                                            : "Duke mbledhur të dhëna për të identifikuar orët e pikut..."}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {insight && (
                    <div className="pt-4 border-t border-border-main">
                        <div className="flex items-start gap-2">
                            <div className="mt-0.5 p-1 bg-primary/20 rounded text-primary">
                                <Info size={12} />
                            </div>
                            <p className="text-xs text-text-muted leading-relaxed font-medium">
                                <span className="text-primary font-semibold mr-1">AI INSIGHT:</span> 
                                {insight}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};