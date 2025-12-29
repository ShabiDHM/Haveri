// FILE: src/components/business/insights/DebtModule.tsx
// PHOENIX PROTOCOL - DEBT MODULE V2.1 (MOBILE & SCROLL)
// 1. LAYOUT: h-auto for mobile, fixed h-[540px] for desktop.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Send, User } from 'lucide-react';

interface DebtModuleProps {
    data: {
        totalDebt: number;
        aging: { fresh: number; warning: number; danger: number };
        topDebtors: any[];
    };
}

export const DebtModule: React.FC<DebtModuleProps> = ({ data }) => {
    const { t } = useTranslation();
    const { totalDebt, aging, topDebtors } = data;

    const sendWhatsApp = (debtor: any) => {
        const message = `Përshëndetje ${debtor.name}, ju lutem verifikoni pagesën e mbetur prej €${debtor.amount.toFixed(2)}. Faleminderit!`;
        const url = `https://wa.me/${debtor.phone || ''}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md h-auto lg:h-[540px] flex flex-col">
            
            <div className="flex-shrink-0">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <AlertTriangle className="text-rose-500" /> {t('insights.debt.title', 'Analiza e Borxheve')}
                </h3>

                {/* Aging Bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-sm mb-2 text-gray-400">
                        <span>Totali i Borxhit</span>
                        <span className="text-white font-mono font-bold">€{totalDebt.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden flex">
                        <div style={{ width: `${totalDebt > 0 ? (aging.fresh / totalDebt) * 100 : 0}%` }} className="bg-emerald-500 h-full" title="0-30 Ditë" />
                        <div style={{ width: `${totalDebt > 0 ? (aging.warning / totalDebt) * 100 : 0}%` }} className="bg-amber-500 h-full" title="30-60 Ditë" />
                        <div style={{ width: `${totalDebt > 0 ? (aging.danger / totalDebt) * 100 : 0}%` }} className="bg-rose-500 h-full" title="60+ Ditë" />
                    </div>
                    <div className="flex justify-between text-xs mt-2 text-gray-500">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> E re (0-30)</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Kujdes (30-60)</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Kritik (60+)</span>
                    </div>
                </div>

                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{t('insights.debt.topDebtors', 'Klientët me Borxhe')}</h4>
            </div>

            {/* Scrollable List - Desktop (flex-1) & Mobile (max-h restricted if needed, but flex handles it) */}
            <div className="flex-1 overflow-y-auto pr-2 min-h-0 space-y-3 custom-scrollbar max-h-[300px] lg:max-h-none">
                {topDebtors.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">{t('insights.debt.noDebts', 'Asnjë borxh aktiv!')}</p>
                ) : (
                    topDebtors.map((d: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 bg-white/5 rounded-lg shrink-0"><User size={16} className="text-gray-300" /></div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{d.name}</p>
                                    <p className="text-xs text-rose-400">{d.daysOverdue} {t('time.days', 'ditë vonesë')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="font-mono text-white font-bold">€{d.amount.toFixed(2)}</span>
                                <button 
                                    onClick={() => sendWhatsApp(d)}
                                    className="p-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                                    title="Dërgo Rikujtesë në WhatsApp"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};