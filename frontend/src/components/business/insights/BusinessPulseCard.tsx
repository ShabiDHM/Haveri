// FILE: src/components/business/insights/BusinessPulseCard.tsx
// PHOENIX PROTOCOL - PULSE CARD V11.0 (GLASSMORPHISM ALIGNED)

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
        <div className="glass-panel flex flex-col h-full min-h-[480px] p-6 sm:p-8 hover-lift relative overflow-hidden group">
            
            {/* Ambient Background Glow (Subtle) */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-start/5 rounded-full blur-[60px] group-hover:bg-primary-start/10 transition-colors pointer-events-none" />
            
            {/* Executive Header */}
            <div className="flex justify-between items-center border-b border-border-main pb-5 mb-6 flex-shrink-0 relative z-10">
                <div className="flex items-center gap-3">
                    <Activity className="text-primary-start" size={20} />
                    <h2 className="text-sm font-black text-text-primary uppercase tracking-widest leading-none">
                        {t('dashboard.pulse.title', 'Pulsi')}
                    </h2>
                </div>
                <span className="flex h-2.5 w-2.5 relative">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRestDay ? 'bg-primary-start' : 'bg-success-start'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRestDay ? 'bg-primary-start' : 'bg-success-start'}`}></span>
                </span>
            </div>

            <div className="flex flex-col flex-1 min-h-0 relative z-10">
                {/* Main Value Area */}
                <div className="mb-8">
                    <div className="flex items-end gap-3 mb-4">
                        <h2 className="text-3xl font-mono font-black text-text-primary tracking-tight leading-none">
                            €{projection.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </h2>
                        <span className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-1">
                            {t('dashboard.pulse.eodForecast', 'Parashikimi i ditës')}
                        </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden mb-3">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((currentSales / (projection || 1)) * 100, 100)}%` }}
                            className="h-full bg-text-primary rounded-full"
                        />
                    </div>
                    
                    <p className="text-[9px] text-text-muted uppercase font-black tracking-widest flex items-center gap-2">
                        <Zap size={12} className="text-warning-start" /> 
                        {isRestDay ? "Ritmi i ditëve të pushimit (Vikend)" : t('dashboard.pulse.basedOnVelocity', 'Bazuar në ritmin aktual')}
                    </p>
                </div>

                {/* Inner Insight Card */}
                <div className="glass-input p-5 mb-6 flex-shrink-0">
                    {hotItem ? (
                        <div className="flex items-start gap-4">
                            <div className="text-danger shrink-0 mt-0.5"><TrendingUp size={16} /></div>
                            <div>
                                <p className="text-[10px] text-danger uppercase font-black tracking-widest mb-1.5">Trendi Hot</p>
                                <p className="text-xs text-text-primary font-bold">"{hotItem.label}" po kërkohet shumë.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-4">
                            <div className="text-primary-start shrink-0 mt-0.5">
                                {isRestDay ? <Coffee size={16} /> : <Clock size={16} />}
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] text-primary-start uppercase font-black tracking-widest mb-1.5">
                                    {isRestDay ? "Sygjerim për Vikend" : t('dashboard.pulse.trafficAnalysis', 'Analiza e Trafikut')}
                                </p>
                                {peakTime ? (
                                    <p className="text-xs text-text-primary font-bold">
                                        Fluks i lartë pritet rreth orës: <span className="text-primary-start">{peakTime}</span>.
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-text-muted uppercase font-black tracking-widest leading-relaxed">
                                        {isRestDay 
                                            ? "Fundjavat zakonisht kanë fluks më të ulët. Fokusohuni në rishikimin e javës."
                                            : "Duke mbledhur të dhëna për të identifikuar orët e pikut..."}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* AI Insight Footer - Pushed to bottom */}
                {insight && (
                    <div className="mt-auto pt-5 border-t border-border-main flex items-start gap-3">
                        <div className="text-primary-start shrink-0 mt-0.5">
                            <Info size={14} />
                        </div>
                        <p className="text-[10px] text-text-muted uppercase font-black tracking-widest leading-relaxed">
                            <span className="text-primary-start mr-1">AI:</span> 
                            {insight}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};