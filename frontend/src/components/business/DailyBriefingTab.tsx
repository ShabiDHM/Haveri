// FILE: src/components/business/DailyBriefingTab.tsx
// PHOENIX PROTOCOL - COMPONENT V3.2 (FIXED EXPORT)
// 1. EXPORT: Uses 'export const DailyBriefingTab' (Named Export).
// 2. LOGIC: Includes Albanian Date and Proactive Dashboard logic.

import React, { useEffect, useState } from 'react';
import { 
    Zap, 
    CheckCircle2, 
    FileText, 
    ArrowRight, 
    TrendingUp, 
    AlertCircle, 
    CalendarClock,
    Loader2,
    Euro,
    Award
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dailyBriefingService } from '../../services/dailyBriefingService';
import { DailyBriefingResponse } from '../../types/dailyBriefing';

export const DailyBriefingTab: React.FC = () => {
  const { t } = useTranslation();
  
  // PHOENIX FIX: Manual Albanian Date Formatting
  const getAlbanianDate = () => {
      const d = new Date();
      const days = ['E Diel', 'E Hënë', 'E Martë', 'E Mërkurë', 'E Enjte', 'E Premte', 'E Shtunë'];
      const months = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  };
  const currentDate = getAlbanianDate();
  
  const [data, setData] = useState<DailyBriefingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        const result = await dailyBriefingService.getMorningReport();
        setData(result);
      } catch (err) {
        console.error("Failed to load briefing:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchBriefing();
  }, []);

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Loader2 className="w-8 h-8 text-primary-light animate-spin" />
              <p className="text-gray-400 text-sm">{t('general.loading', 'Duke ngarkuar...')}</p>
          </div>
      );
  }

  if (error || !data) {
      return (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <h3 className="text-white font-bold">{t('error.generic', 'Gabim')}</h3>
              <p className="text-gray-400 text-sm mt-1">{t('error.failedToLoad', 'Dështoi gjenerimi i raportit.')}</p>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in">
        {/* AI HEADER */}
        <div className="bg-gradient-to-r from-primary-start/20 to-primary-end/20 border border-primary-start/30 rounded-2xl p-6 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-primary-start rounded-lg">
                        <Zap size={16} className="text-white fill-white" />
                    </div>
                    <span className="text-xs font-bold text-primary-light uppercase tracking-wider">
                        {t('daily_briefing.agent_name', 'Haveri AI Agent')}
                    </span>
                </div>
                <h2 className="text-2xl font-bold text-white">
                    {t('daily_briefing.morning_report', 'Raporti i Mëngjesit')}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                    {currentDate} • {t('daily_briefing.run_time', 'Gjeneruar në 06:00')}
                </p>
            </div>
            <div className="flex items-center gap-3">
                {/* System Status Indicator */}
                {!data.finance.attention_needed && !data.inventory.risk_alert ? (
                    <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)] animate-pulse">
                        <CheckCircle2 size={16} className="text-green-400" />
                        <span className="text-green-400 text-sm font-medium">{t('daily_briefing.system_optimal', 'Sistemet Optimale')}</span>
                    </div>
                ) : (
                    <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-2 animate-pulse">
                        <AlertCircle size={16} className="text-amber-400" />
                        <span className="text-amber-400 text-sm font-medium">{t('daily_briefing.attention_needed', 'Veprim i Kërkuar')}</span>
                    </div>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* CARD 1: FINANCE */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-0 overflow-hidden backdrop-blur-md flex flex-col">
                <div className="p-5 border-b border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                            {data.finance.attention_needed ? <FileText size={20} /> : <Euro size={20} />}
                        </div>
                        <h3 className="font-semibold text-white">{t('business.finance')}</h3>
                    </div>
                    {data.finance.attention_needed && (
                        <span className="text-xs font-medium px-2 py-1 bg-amber-500/20 text-amber-400 rounded-md border border-amber-500/20">
                            {data.finance.unpaid_count} {t('status.PENDING', 'Në Pritje')}
                        </span>
                    )}
                </div>
                <div className="p-5 flex-1">
                    {!data.finance.attention_needed ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                             <p className="text-gray-400 text-xs uppercase tracking-widest">Të hyrat dje</p>
                             <div className="text-4xl font-bold text-white tracking-tight">
                                €{data.finance.revenue_yesterday.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                             </div>
                             <p className="text-green-400 text-xs bg-green-500/10 px-2 py-1 rounded-full border border-green-500/10">
                                +12% nga mesatarja
                             </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                             <p className="text-gray-400 text-sm mb-4">{t('daily_briefing.finance_summary', 'Faturat e prapambetura:')}</p>
                             {data.finance.items.map((inv, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                    <div>
                                        <p className="text-sm font-medium text-white">{inv.client}</p>
                                        <p className="text-xs text-red-400">{inv.invoice_number} • {inv.status}</p>
                                    </div>
                                    <span className="font-mono text-white">€{inv.amount.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 bg-white/5 border-t border-white/5 mt-auto">
                    <button className="w-full py-2 text-sm text-center text-primary-light hover:text-white transition-colors flex items-center justify-center gap-2">
                        {t('daily_briefing.view_finances', 'Shiko Financat')} <ArrowRight size={14} />
                    </button>
                </div>
            </div>

            {/* CARD 2: INVENTORY */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-0 overflow-hidden backdrop-blur-md flex flex-col">
                <div className="p-5 border-b border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                            {data.inventory.risk_alert ? <TrendingUp size={20} /> : <Award size={20} />}
                        </div>
                        <h3 className="font-semibold text-white">{t('daily_briefing.predictive_stock', 'Inventari')}</h3>
                    </div>
                    {data.inventory.risk_alert && (
                        <span className="text-xs font-medium px-2 py-1 bg-red-500/20 text-red-400 rounded-md border border-red-500/20">
                            {t('daily_briefing.risk_alert', 'Rrezik')}
                        </span>
                    )}
                </div>
                <div className="p-5 flex-1">
                    {!data.inventory.risk_alert ? (
                         <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                            <p className="text-gray-400 text-xs uppercase tracking-widest">Produkti më i shitur dje</p>
                            <div className="text-2xl font-bold text-white line-clamp-2">
                               {data.inventory.top_product === "N/A" ? "Pa të dhëna" : data.inventory.top_product}
                            </div>
                            <div className="w-16 h-1 bg-purple-500/30 rounded-full">
                                <div className="w-3/4 h-full bg-purple-500 rounded-full"></div>
                            </div>
                       </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-gray-400 text-sm mb-4">{t('daily_briefing.inventory_prediction', 'Stoku i ulët:')}</p>
                            {data.inventory.items.map((item, idx) => (
                                <div key={idx} className={`p-3 rounded-xl border ${item.status === 'CRITICAL' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm font-medium text-white">{item.name}</span>
                                        <span className={`text-xs font-bold ${item.status === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}`}>{item.status}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 flex items-center gap-1">
                                        <AlertCircle size={10} /> 
                                        {t('daily_briefing.stock_remaining', 'Mbetur')}: {item.remaining}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 bg-white/5 border-t border-white/5 mt-auto">
                    <button className="w-full py-2 text-sm text-center text-primary-light hover:text-white transition-colors flex items-center justify-center gap-2">
                        {t('daily_briefing.manage_inventory', 'Menaxho Inventarin')} <ArrowRight size={14} />
                    </button>
                </div>
            </div>

            {/* CARD 3: CALENDAR */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-0 overflow-hidden backdrop-blur-md flex flex-col">
                <div className="p-5 border-b border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                            <CalendarClock size={20} />
                        </div>
                        <h3 className="font-semibold text-white">{t('calendar.today', 'Sot')}</h3>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-white/10 text-gray-300 rounded-md border border-white/10">
                        {t('daily_briefing.events_count', { count: data.calendar.event_count })}
                    </span>
                </div>
                <div className="p-5 flex-1">
                    <div className="relative border-l border-white/10 ml-2 space-y-6 py-2">
                        {data.calendar.items.length === 0 ? (
                             <div className="pl-6 pt-4 flex flex-col gap-2">
                                <p className="text-sm text-gray-500 italic">Nuk ka ngjarje për sot.</p>
                                <p className="text-xs text-emerald-400/80">Koha e lirë është mundësi për planifikim strategjik.</p>
                             </div>
                        ) : (
                            data.calendar.items.map((evt, idx) => (
                                <div key={idx} className="relative pl-6">
                                    <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border border-background ${evt.is_alert ? 'bg-red-500' : 'bg-primary-start'}`}></div>
                                    <span className={`text-xs font-mono mb-0.5 block flex items-center gap-2 ${evt.is_alert ? 'text-red-400' : 'text-primary-light'}`}>
                                        {new Date(evt.time).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                                        {evt.is_alert && <span className="text-[10px] bg-red-500/10 px-1 rounded uppercase">Afati</span>}
                                    </span>
                                    <h4 className="text-sm font-medium text-white">{evt.title}</h4>
                                    <p className="text-xs text-gray-500">{evt.location || 'Online'}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className="p-4 bg-white/5 border-t border-white/5 mt-auto">
                    <button className="w-full py-2 text-sm text-center text-primary-light hover:text-white transition-colors flex items-center justify-center gap-2">
                        {t('daily_briefing.open_calendar', 'Hap Kalendarin')} <ArrowRight size={14} />
                    </button>
                </div>
            </div>

        </div>
    </div>
  );
};