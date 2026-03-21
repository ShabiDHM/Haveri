// FILE: src/components/business/insights/DebtModule.tsx
// PHOENIX PROTOCOL - DEBT MODULE V4.0 (ENHANCED BORDERS & COLORS)
// 1. UPDATED: Added colored left border and better visual hierarchy
// 2. ENHANCED: Cards now have accent borders with hover effects

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
        <div className="bg-surface/50 border border-border-main rounded-2xl p-6 backdrop-blur-md h-auto lg:h-[540px] flex flex-col shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            {/* Colored top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-danger to-danger/60" />
            
            <div className="flex-shrink-0">
                <h3 className="text-2xl font-bold text-text-primary mb-6 flex items-center gap-2">
                    <AlertTriangle className="text-danger" /> {t('insights.debt.title', 'Analiza e Borxheve')}
                </h3>

                <div className="mb-8 p-4 bg-surface rounded-xl border border-border-main">
                    <div className="flex justify-between text-sm mb-2 text-text-muted">
                        <span className="font-semibold">Totali i Borxhit</span>
                        <span className={`font-mono font-bold ${totalDebt > 0 ? 'text-danger' : 'text-text-primary'}`}>
                            €{totalDebt.toFixed(2)}
                        </span>
                    </div>
                    <div className="w-full h-3 bg-border-main rounded-full overflow-hidden flex">
                        <div style={{ width: `${totalDebt > 0 ? (aging.fresh / totalDebt) * 100 : 0}%` }} className="bg-success-start h-full" title="0-30 Ditë" />
                        <div style={{ width: `${totalDebt > 0 ? (aging.warning / totalDebt) * 100 : 0}%` }} className="bg-warning-start h-full" title="30-60 Ditë" />
                        <div style={{ width: `${totalDebt > 0 ? (aging.danger / totalDebt) * 100 : 0}%` }} className="bg-danger h-full" title="60+ Ditë" />
                    </div>
                    <div className="flex justify-between text-xs mt-3 text-text-muted">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-success-start shadow-sm"></div> E re (0-30)</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-warning-start shadow-sm"></div> Kujdes (30-60)</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-danger shadow-sm"></div> Kritik (60+)</span>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-text-muted uppercase tracking-wider">{t('insights.debt.topDebtors', 'Klientët me Borxhe')}</h4>
                    <div className="h-px flex-1 ml-4 bg-border-main"></div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 min-h-0 space-y-3 custom-scrollbar max-h-[300px] lg:max-h-none">
                {topDebtors.length === 0 ? (
                    <div className="p-8 text-center bg-surface rounded-xl border border-border-main">
                        <p className="text-text-muted text-sm italic">{t('insights.debt.noDebts', 'Asnjë borxh aktiv!')}</p>
                    </div>
                ) : (
                    topDebtors.map((d: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border-main hover:border-danger/30 hover:shadow-md transition-all shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 bg-danger/10 rounded-lg shrink-0 border border-danger/20"><User size={16} className="text-danger" /></div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-text-primary truncate">{d.name}</p>
                                    <p className="text-xs text-danger font-medium">{d.daysOverdue} {t('time.days', 'ditë vonesë')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="font-mono text-text-primary font-bold bg-surface px-2 py-1 rounded border border-border-main">€{d.amount.toFixed(2)}</span>
                                <button 
                                    onClick={() => sendWhatsApp(d)}
                                    className="p-2 bg-success-start/10 text-success-start hover:bg-success-start/20 rounded-lg transition-colors border border-success-start/20 hover:border-success-start/40"
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