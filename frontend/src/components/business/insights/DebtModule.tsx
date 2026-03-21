// FILE: src/components/business/insights/DebtModule.tsx
// PHOENIX PROTOCOL - DEBT MODULE V3.0 (DESIGN SYSTEM ALIGNMENT)
// 1. TYPOGRAPHY: Upgraded Header to 'text-2xl' for consistency.
// 2. UPDATED: Uses new design system CSS variables for light/dark theme compatibility.

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
        <div className="bg-surface/50 border border-border-main rounded-2xl p-6 backdrop-blur-md h-auto lg:h-[540px] flex flex-col shadow-sm">
            
            <div className="flex-shrink-0">
                <h3 className="text-2xl font-bold text-text-primary mb-6 flex items-center gap-2">
                    <AlertTriangle className="text-danger" /> {t('insights.debt.title', 'Analiza e Borxheve')}
                </h3>

                <div className="mb-8">
                    <div className="flex justify-between text-sm mb-2 text-text-muted">
                        <span>Totali i Borxhit</span>
                        <span className="text-text-primary font-mono font-bold">€{totalDebt.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-4 bg-border-main rounded-full overflow-hidden flex">
                        <div style={{ width: `${totalDebt > 0 ? (aging.fresh / totalDebt) * 100 : 0}%` }} className="bg-success-start h-full" title="0-30 Ditë" />
                        <div style={{ width: `${totalDebt > 0 ? (aging.warning / totalDebt) * 100 : 0}%` }} className="bg-warning-start h-full" title="30-60 Ditë" />
                        <div style={{ width: `${totalDebt > 0 ? (aging.danger / totalDebt) * 100 : 0}%` }} className="bg-danger h-full" title="60+ Ditë" />
                    </div>
                    <div className="flex justify-between text-xs mt-2 text-text-muted">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-success-start"></div> E re (0-30)</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-warning-start"></div> Kujdes (30-60)</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-danger"></div> Kritik (60+)</span>
                    </div>
                </div>

                <h4 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">{t('insights.debt.topDebtors', 'Klientët me Borxhe')}</h4>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 min-h-0 space-y-3 custom-scrollbar max-h-[300px] lg:max-h-none">
                {topDebtors.length === 0 ? (
                    <p className="text-text-muted text-sm italic">{t('insights.debt.noDebts', 'Asnjë borxh aktiv!')}</p>
                ) : (
                    topDebtors.map((d: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border-main shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 bg-surface rounded-lg shrink-0 border border-border-main"><User size={16} className="text-text-secondary" /></div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-text-primary truncate">{d.name}</p>
                                    <p className="text-xs text-danger">{d.daysOverdue} {t('time.days', 'ditë vonesë')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="font-mono text-text-primary font-bold">€{d.amount.toFixed(2)}</span>
                                <button 
                                    onClick={() => sendWhatsApp(d)}
                                    className="p-2 bg-success-start/10 text-success-start hover:bg-success-start/20 rounded-lg transition-colors"
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