// FILE: src/components/business/DailyBriefingTab.tsx
// PHOENIX PROTOCOL - DAILY BRIEFING V17.2 (I18N FIX)
// 1. FIX: Removed all hardcoded text strings found in previous version.
// 2. LOGIC: All text now uses t('key', 'Fallback') pattern.
// 3. STATUS: Production Ready & Fully Translatable.

import React, { useEffect, useState } from 'react';
import { 
    TrendingUp, TrendingDown, AlertCircle, CalendarClock, Loader2, Euro, Award, Info
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { sq, enUS } from 'date-fns/locale';
import { apiService } from '../../services/api';
// Import shared types
import { DailyBriefingResponse, FinanceBriefingItem, InventoryBriefingItem, CalendarBriefingItem } from '../../data/types';

export const DailyBriefingTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  // Locale Setup
  const localeMap: { [key: string]: any } = { sq, al: sq, en: enUS };
  const currentLocale = localeMap[i18n.language] || enUS;
  const currentDate = format(new Date(), 'EEEE, d MMMM', { locale: currentLocale });
  
  // State
  const [data, setData] = useState<DailyBriefingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        const result = await apiService.getDailyBriefing();
        setData(result as unknown as DailyBriefingResponse);
      } catch (err) {
        console.error("Failed to load briefing:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchBriefing();
  }, []);

  if (loading) return <div className="flex flex-col items-center justify-center h-96 space-y-4"><Loader2 className="w-10 h-10 text-primary-start animate-spin" /><p className="text-gray-400 text-sm font-medium animate-pulse">{t('general.loading', 'Duke analizuar të dhënat...')}</p></div>;
  if (error || !data) return <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center"><AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" /><h3 className="text-white font-bold">{t('error.generic', 'Gabim')}</h3><p className="text-gray-400 text-sm mt-1">{t('error.failedToLoad', 'Dështoi gjenerimi i raportit ditor.')}</p></div>;

  return (
    <div className="space-y-6 animate-fade-in">
        {/* HEADER */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-start/20 to-primary-end/20 border border-primary-start/30 p-6 sm:p-8 backdrop-blur-md">
            <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">{t('daily_briefing.morning_report', 'Raporti i Mëngjesit')}</h2>
                <div className="flex items-center gap-2 text-primary-light/80 text-sm sm:text-base font-medium">
                    <CalendarClock size={18} />
                    <span className="capitalize">{currentDate}</span>
                    <span className="mx-2">•</span>
                    <span>{t('daily_briefing.run_time', 'Gjeneruar në 06:00')}</span>
                </div>
            </div>
            {/* Background Decoration */}
            <div className="absolute right-0 top-0 w-64 h-64 bg-primary-start/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* FINANCE SECTION */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col h-full hover:bg-white/10 transition-colors duration-300">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${data.finance?.attention_needed ? 'bg-amber-500/10 text-amber-400 shadow-lg shadow-amber-500/10' : 'bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/10'}`}>
                            {data.finance?.attention_needed ? <AlertCircle size={20} /> : <Euro size={20} />}
                        </div>
                        <h3 className="font-bold text-lg text-white">{t('business.finance')}</h3>
                    </div>
                    {data.finance?.attention_needed && (
                        <span className="text-[10px] font-bold px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 uppercase tracking-wider">
                            {data.finance.unpaid_count} {t('status.PENDING', 'Në Pritje')}
                        </span>
                    )}
                </div>
                
                <div className="flex-1 flex flex-col justify-center">
                    {!data.finance?.attention_needed ? (
                        <div className="flex flex-col items-center justify-center text-center space-y-3 py-4">
                            <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">{t('daily_briefing.revenue_yesterday', 'Të hyrat dje')}</p>
                            <div className="text-5xl font-bold text-white tracking-tighter">
                                €{data.finance?.revenue_yesterday?.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-400 text-xs bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/10 font-medium">
                                <TrendingUp size={12} />
                                <span>{t('daily_briefing.financial_stability', 'Stabilitet Financiar')}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-amber-400/80 text-xs mb-2">
                                <Info size={12} />
                                <span>{t('daily_briefing.action_required', 'Veprim i kërkuar:')}</span>
                            </div>
                             {data.finance?.items?.map((inv: FinanceBriefingItem, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5 hover:border-amber-500/30 transition-colors">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">{inv.client}</p>
                                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{inv.invoice_number}</p>
                                    </div>
                                    <span className="font-mono text-sm font-bold text-amber-400 whitespace-nowrap pl-4">€{inv.amount.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* INVENTORY SECTION */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col h-full hover:bg-white/10 transition-colors duration-300">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${data.inventory?.risk_alert ? 'bg-rose-500/10 text-rose-400 shadow-lg shadow-rose-500/10' : 'bg-purple-500/10 text-purple-400 shadow-lg shadow-purple-500/10'}`}>
                            {data.inventory?.risk_alert ? <TrendingDown size={20} /> : <Award size={20} />}
                        </div>
                        <h3 className="font-bold text-lg text-white">{t('daily_briefing.predictive_stock', 'Inventari')}</h3>
                    </div>
                    {data.inventory?.risk_alert && (
                        <span className="text-[10px] font-bold px-2.5 py-1 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20 uppercase tracking-wider">
                            {t('daily_briefing.risk_alert', 'Rrezik')}
                        </span>
                    )}
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    {!data.inventory?.risk_alert ? (
                         <div className="flex flex-col items-center justify-center text-center space-y-4 py-4">
                            <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">{t('daily_briefing.top_product_24h', 'Produkti Top (24h)')}</p>
                            <div className="text-2xl font-bold text-white line-clamp-2 px-4 leading-tight">
                                {data.inventory?.top_product === "N/A" ? t('general.noData', 'Pa të dhëna') : data.inventory?.top_product}
                            </div>
                            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="w-full h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-rose-400/80 text-xs mb-2">
                                <AlertCircle size={12} />
                                <span>{t('daily_briefing.inventory_prediction', 'Stoku kritik:')}</span>
                            </div>
                            {data.inventory?.items?.map((item: InventoryBriefingItem, idx: number) => (
                                <div key={idx} className={`p-3 rounded-xl border ${item.status === 'CRITICAL' ? 'bg-rose-500/5 border-rose-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm font-medium text-white truncate pr-2">{item.name}</span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.status === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                            {item.status}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 flex items-center gap-1.5 mt-1">
                                        <TrendingDown size={10} /> 
                                        {t('daily_briefing.stock_remaining', 'Mbetur')}: <span className="text-white font-mono">{item.remaining}</span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* CALENDAR SECTION */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col h-full hover:bg-white/10 transition-colors duration-300">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 shadow-lg shadow-blue-500/10">
                            <CalendarClock size={20} />
                        </div>
                        <h3 className="font-bold text-lg text-white">{t('calendar.today', 'Sot')}</h3>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-white/5 text-gray-400 rounded-lg border border-white/10">
                        {data.calendar?.event_count || 0} {t('calendar.events', 'Ngjarje')}
                    </span>
                </div>

                <div className="flex-1 flex flex-col">
                    <div className="relative border-l border-white/10 ml-2 space-y-6 py-1">
                        {(!data.calendar?.items || data.calendar.items.length === 0) ? (
                             <div className="pl-8 flex flex-col justify-center h-full min-h-[120px]">
                                <p className="text-sm text-gray-500 italic">{t('calendar.noEventsToday', 'Nuk ka ngjarje për sot.')}</p>
                                <p className="text-xs text-blue-400/60 mt-2 flex items-center gap-2">
                                    <Award size={12} /> 
                                    {t('calendar.focusTime', 'Koha për fokus.')}
                                </p>
                             </div>
                        ) : (
                            data.calendar.items.map((evt: CalendarBriefingItem, idx: number) => (
                                <div key={idx} className="relative pl-6 group">
                                    {/* Timeline Dot */}
                                    <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-background transition-transform duration-300 group-hover:scale-125 ${evt.is_alert ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-blue-500'}`}></div>
                                    
                                    <div className="flex items-baseline justify-between mb-1">
                                        <span className={`text-xs font-mono font-bold ${evt.is_alert ? 'text-rose-400' : 'text-blue-400'}`}>
                                            {new Date(evt.time).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {evt.is_alert && <span className="text-[10px] bg-rose-500/10 text-rose-400 px-1.5 rounded font-bold">{t('calendar.deadline', 'AFAT')}</span>}
                                    </div>
                                    
                                    <h4 className="text-sm font-medium text-white group-hover:text-blue-200 transition-colors line-clamp-1">{evt.title}</h4>
                                    <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                                        {evt.location || t('calendar.locationOnline', 'Online')}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};