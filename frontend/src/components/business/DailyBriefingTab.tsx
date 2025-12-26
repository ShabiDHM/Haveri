// FILE: src/components/business/DailyBriefingTab.tsx
// PHOENIX PROTOCOL - DAILY BRIEFING V16.0 (MOBILE OPTIMIZED)
// 1. UI: Adjusted header padding for mobile (p-5 vs p-8).
// 2. UI: Responsive typography for headers and large stats (text-3xl -> text-2xl).
// 3. UI: Optimized card padding (p-4 mobile, p-6 desktop).


import React, { useEffect, useState } from 'react';
import { 
    FileText, TrendingUp, AlertCircle, CalendarClock, Loader2, Euro, Award
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../../services/api';

// 1. Define the specific structures expected by the UI
interface FinanceBriefingItem {
    client: string;
    invoice_number: string;
    amount: number;
}

interface InventoryBriefingItem {
    name: string;
    status: string;
    remaining: number;
}

interface CalendarBriefingItem {
    time: string;
    title: string;
    location?: string;
    is_alert: boolean;
}

// 2. Define the full response structure matching the UI usage
interface FullDailyBriefingResponse {
    id?: string;
    content?: string;
    finance: {
        attention_needed: boolean;
        unpaid_count: number;
        revenue_yesterday: number;
        items: FinanceBriefingItem[];
    };
    inventory: {
        risk_alert: boolean;
        top_product: string;
        items: InventoryBriefingItem[];
    };
    calendar: {
        event_count: number;
        items: CalendarBriefingItem[];
    };
}

export const DailyBriefingTab: React.FC = () => {
  const { t } = useTranslation();
  
  const getAlbanianDate = () => {
      const d = new Date();
      const days = ['E Diel', 'E Hënë', 'E Martë', 'E Mërkurë', 'E Enjte', 'E Premte', 'E Shtunë'];
      const months = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  };
  const currentDate = getAlbanianDate();
  
  // 3. Use the full structure for state
  const [data, setData] = useState<FullDailyBriefingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        const result = await apiService.getDailyBriefing();
        // 4. Cast the result to the expected structure
        setData(result as unknown as FullDailyBriefingResponse);
      } catch (err) {
        console.error("Failed to load briefing:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchBriefing();
  }, []);

  if (loading) return <div className="flex flex-col items-center justify-center h-64 space-y-4"><Loader2 className="w-8 h-8 text-primary-light animate-spin" /><p className="text-gray-400 text-sm">{t('general.loading', 'Duke ngarkuar...')}</p></div>;
  if (error || !data) return <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center"><AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" /><h3 className="text-white font-bold">{t('error.generic', 'Gabim')}</h3><p className="text-gray-400 text-sm mt-1">{t('error.failedToLoad', 'Dështoi gjenerimi i raportit.')}</p></div>;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div className="bg-gradient-to-r from-primary-start/20 to-primary-end/20 border border-primary-start/30 rounded-2xl p-5 sm:p-8 backdrop-blur-md flex flex-col justify-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{t('daily_briefing.morning_report', 'Raporti i Mëngjesit')}</h2>
            <p className="text-gray-400 text-sm sm:text-base">{currentDate} • {t('daily_briefing.run_time', 'Gjeneruar në 06:00')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* FINANCE SECTION */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-md flex flex-col h-full min-h-[250px] sm:min-h-[280px]">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 sm:p-2.5 bg-blue-500/20 rounded-xl text-blue-400">
                            {data.finance?.attention_needed ? <FileText size={20} className="sm:w-[22px] sm:h-[22px]" /> : <Euro size={20} className="sm:w-[22px] sm:h-[22px]" />}
                        </div>
                        <h3 className="font-semibold text-base sm:text-lg text-white">{t('business.finance')}</h3>
                    </div>
                    {data.finance?.attention_needed && (
                        <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/20 uppercase tracking-wider">
                            {data.finance.unpaid_count} {t('status.PENDING', 'Në Pritje')}
                        </span>
                    )}
                </div>
                <div className="flex-1 flex flex-col justify-center">
                    {!data.finance?.attention_needed ? (
                        <div className="flex flex-col items-center justify-center text-center space-y-3">
                            <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-widest font-medium">Të hyrat dje</p>
                            <div className="text-4xl sm:text-5xl font-bold text-white tracking-tight">€{data.finance?.revenue_yesterday?.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</div>
                            <p className="text-emerald-400 text-[10px] sm:text-xs bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/10 font-medium">+12% nga mesatarja</p>
                        </div>
                    ) : (
                        <div className="space-y-3 sm:space-y-4">
                            <p className="text-gray-400 text-xs sm:text-sm mb-2">{t('daily_briefing.finance_summary', 'Faturat e prapambetura:')}</p>
                             {data.finance?.items?.map((inv: FinanceBriefingItem, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-3 sm:p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-xs sm:text-sm font-semibold text-white">{inv.client}</p>
                                        <p className="text-[10px] sm:text-xs text-red-400 mt-0.5">{inv.invoice_number}</p>
                                    </div>
                                    <span className="font-mono text-sm sm:text-base font-medium text-white">€{inv.amount.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* INVENTORY SECTION */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-md flex flex-col h-full min-h-[250px] sm:min-h-[280px]">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 sm:p-2.5 bg-purple-500/20 rounded-xl text-purple-400">
                            {data.inventory?.risk_alert ? <TrendingUp size={20} className="sm:w-[22px] sm:h-[22px]" /> : <Award size={20} className="sm:w-[22px] sm:h-[22px]" />}
                        </div>
                        <h3 className="font-semibold text-base sm:text-lg text-white">{t('daily_briefing.predictive_stock', 'Inventari')}</h3>
                    </div>
                    {data.inventory?.risk_alert && (
                        <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 uppercase tracking-wider">
                            {t('daily_briefing.risk_alert', 'Rrezik')}
                        </span>
                    )}
                </div>
                <div className="flex-1 flex flex-col justify-center">
                    {!data.inventory?.risk_alert ? (
                         <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-widest font-medium">Produkti më i shitur dje</p>
                            <div className="text-xl sm:text-2xl font-bold text-white line-clamp-2 px-2 sm:px-4">{data.inventory?.top_product === "N/A" ? "Pa të dhëna" : data.inventory?.top_product}</div>
                            <div className="w-20 sm:w-24 h-1.5 bg-purple-500/20 rounded-full overflow-hidden">
                                <div className="w-4/5 h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"></div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-gray-400 text-xs sm:text-sm mb-2">{t('daily_briefing.inventory_prediction', 'Stoku i ulët:')}</p>
                            {data.inventory?.items?.map((item: InventoryBriefingItem, idx: number) => (
                                <div key={idx} className={`p-3 rounded-xl border ${item.status === 'CRITICAL' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs sm:text-sm font-medium text-white">{item.name}</span>
                                        <span className={`text-[10px] sm:text-xs font-bold ${item.status === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}`}>{item.status}</span>
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-gray-400 flex items-center gap-1">
                                        <AlertCircle size={10} /> {t('daily_briefing.stock_remaining', 'Mbetur')}: {item.remaining}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* CALENDAR SECTION */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-md flex flex-col h-full min-h-[250px] sm:min-h-[280px]">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 sm:p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400">
                            <CalendarClock size={20} className="sm:w-[22px] sm:h-[22px]" />
                        </div>
                        <h3 className="font-semibold text-base sm:text-lg text-white">{t('calendar.today', 'Sot')}</h3>
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 bg-white/5 text-gray-400 rounded-lg border border-white/10">{data.calendar?.event_count || 0}</span>
                </div>
                <div className="flex-1 flex flex-col">
                    <div className="relative border-l border-white/10 ml-2 space-y-4 sm:space-y-6 py-2">
                        {(!data.calendar?.items || data.calendar.items.length === 0) ? (
                             <div className="pl-6 sm:pl-8 pt-6 sm:pt-8 flex flex-col justify-center h-full">
                                <p className="text-xs sm:text-sm text-gray-500 italic">Nuk ka ngjarje për sot.</p>
                                <p className="text-[10px] sm:text-xs text-emerald-400/60 mt-2">Koha e lirë është mundësi për planifikim.</p>
                             </div>
                        ) : (
                            data.calendar.items.map((evt: CalendarBriefingItem, idx: number) => (
                                <div key={idx} className="relative pl-6 group">
                                    <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border border-background transition-transform group-hover:scale-125 ${evt.is_alert ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-primary-start'}`}></div>
                                    <span className={`text-[10px] sm:text-xs font-mono mb-1 block flex items-center gap-2 ${evt.is_alert ? 'text-red-400 font-bold' : 'text-primary-light'}`}>
                                        {new Date(evt.time).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                                        {evt.is_alert && <span className="text-[10px] bg-red-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">Afati</span>}
                                    </span>
                                    <h4 className="text-xs sm:text-sm font-medium text-white group-hover:text-primary-light transition-colors">{evt.title}</h4>
                                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{evt.location || 'Online'}</p>
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