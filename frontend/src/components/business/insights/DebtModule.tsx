// FILE: src/components/business/insights/DebtModule.tsx
// PHOENIX PROTOCOL - DEBT MODULE V9.2 (EXECUTIVE DESIGN SYSTEM)
// Fixed: Replaced text-[9px] with text-xs for consistency.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Send, User, CheckCircle } from 'lucide-react';

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

    const hasDebt = totalDebt > 0;

    return (
        <div className="glass-panel flex flex-col h-full min-h-[480px] p-6 sm:p-8 hover-lift shadow-sm border border-border-main">
            
            {/* Executive Header */}
            <div className="flex items-center gap-3 border-b border-border-main pb-5 mb-6 flex-shrink-0">
                {hasDebt ? (
                    <AlertTriangle className="text-danger-start" size={20} />
                ) : (
                    <CheckCircle className="text-success-start" size={20} />
                )}
                <h2 className="text-sm font-black text-text-primary uppercase tracking-widest leading-none">
                    {t('insights.debt.title', 'Analiza e Borxheve')}
                </h2>
            </div>

            <div className="flex flex-col flex-1 min-h-0">
                {/* Total Debt Summary Box */}
                <div className="glass-input p-5 mb-6 flex-shrink-0 border border-border-main bg-surface/30 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs text-text-muted uppercase font-black tracking-widest">
                            Totali i Borxhit
                        </span>
                        <span className={`font-mono font-black text-lg ${hasDebt ? 'text-danger-start' : 'text-text-primary'}`}>
                            €{totalDebt.toFixed(2)}
                        </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-canvas/20 rounded-full overflow-hidden flex mb-3">
                        <div style={{ width: `${hasDebt ? (aging.fresh / totalDebt) * 100 : 0}%` }} className="bg-success-start h-full" />
                        <div style={{ width: `${hasDebt ? (aging.warning / totalDebt) * 100 : 0}%` }} className="bg-warning-start h-full" />
                        <div style={{ width: `${hasDebt ? (aging.danger / totalDebt) * 100 : 0}%` }} className="bg-danger-start h-full" />
                    </div>
                    
                    {/* Legend */}
                    <div className="flex justify-between text-xs uppercase font-black tracking-widest text-text-muted">
                        <span className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-success-start" /> 0-30
                        </span>
                        <span className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-warning-start" /> 30-60
                        </span>
                        <span className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-danger-start" /> 60+
                        </span>
                    </div>
                </div>

                {/* Debtors List Section */}
                <h3 className="block text-xs text-text-muted uppercase font-black tracking-widest mb-3 flex-shrink-0">
                    {t('insights.debt.topDebtors', 'Klientët me Borxhe')}
                </h3>

                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                    {topDebtors.length === 0 ? (
                        <div className="glass-input p-6 flex items-center justify-center text-center border border-border-main bg-surface/30 backdrop-blur-sm">
                            <p className="text-xs text-text-muted uppercase font-black tracking-widest">
                                {t('insights.debt.noDebts', 'Asnjë borxh aktiv!')}
                            </p>
                        </div>
                    ) : (
                        topDebtors.map((d: any, idx: number) => (
                            <div key={idx} className="glass-input p-4 flex items-center justify-between group hover:border-danger-start/30 transition-all border border-border-main bg-surface/30 backdrop-blur-sm hover-lift">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="text-danger-start/70 group-hover:text-danger-start transition-colors shrink-0">
                                        <User size={16} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-text-primary truncate">{d.name}</p>
                                        <p className="text-xs text-danger-start uppercase font-black tracking-widest mt-0.5">
                                            {d.daysOverdue} {t('time.days', 'ditë vonesë')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="font-mono text-sm font-black text-text-primary">
                                        €{d.amount.toFixed(2)}
                                    </span>
                                    <button 
                                        onClick={() => sendWhatsApp(d)}
                                        className="text-text-muted hover:text-success-start transition-colors p-1 hover-lift shadow-sm"
                                        title="Dërgo Rikujtesë"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};