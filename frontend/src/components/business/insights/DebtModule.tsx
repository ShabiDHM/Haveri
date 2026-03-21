// FILE: src/components/business/insights/DebtModule.tsx
// PHOENIX PROTOCOL - DEBT MODULE V7.0 (CONSISTENT WHITE BACKGROUND)
// UPDATED: Changed background to bg-card

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
        <div className="bg-card border border-border-strong rounded-2xl flex flex-col h-full min-h-[480px] max-h-[600px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative">
            {/* Colored top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-danger to-danger/60 z-10" />
            
            <div className="p-5 flex-shrink-0">
                <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                    <AlertTriangle className="text-danger" size={20} /> 
                    {t('insights.debt.title', 'Analiza e Borxheve')}
                </h3>

                <div className="mb-5 p-4 bg-surface rounded-xl border border-border-strong">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-text-muted">Totali i Borxhit</span>
                        <span className={`font-mono font-bold text-lg ${totalDebt > 0 ? 'text-danger' : 'text-text-primary'}`}>
                            €{totalDebt.toFixed(2)}
                        </span>
                    </div>
                    <div className="w-full h-2 bg-border-strong rounded-full overflow-hidden flex">
                        <div style={{ width: `${totalDebt > 0 ? (aging.fresh / totalDebt) * 100 : 0}%` }} className="bg-success-start h-full" />
                        <div style={{ width: `${totalDebt > 0 ? (aging.warning / totalDebt) * 100 : 0}%` }} className="bg-warning-start h-full" />
                        <div style={{ width: `${totalDebt > 0 ? (aging.danger / totalDebt) * 100 : 0}%` }} className="bg-danger h-full" />
                    </div>
                    <div className="flex justify-between text-xs mt-3 text-text-muted">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-success-start" /> 0-30</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-warning-start" /> 30-60</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-danger" /> 60+</span>
                    </div>
                </div>

                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                    {t('insights.debt.topDebtors', 'Klientët me Borxhe')}
                </h4>
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2 custom-scrollbar">
                {topDebtors.length === 0 ? (
                    <div className="p-6 text-center bg-surface rounded-xl border border-border-strong">
                        <p className="text-text-muted text-sm">{t('insights.debt.noDebts', 'Asnjë borxh aktiv!')}</p>
                    </div>
                ) : (
                    topDebtors.map((d: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border-strong hover:border-danger/30 hover:shadow-sm transition-all">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="p-2 bg-danger/10 rounded-lg shrink-0"><User size={14} className="text-danger" /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-text-primary truncate">{d.name}</p>
                                    <p className="text-xs text-danger">{d.daysOverdue} {t('time.days', 'ditë vonesë')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono text-sm font-bold text-text-primary">€{d.amount.toFixed(2)}</span>
                                <button 
                                    onClick={() => sendWhatsApp(d)}
                                    className="p-2 bg-success-start/10 text-success-start hover:bg-success-start/20 rounded-lg transition-colors"
                                    title="Dërgo Rikujtesë"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};