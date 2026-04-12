// FILE: src/components/business/insights/TaxModule.tsx
// PHOENIX PROTOCOL - TAX MODULE V14.2 (RE‑ATTACHED TO GLOBAL DESIGN SYSTEM)

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Landmark, TrendingDown, TrendingUp, Calculator, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ForensicAccountantModal } from './ForensicAccountantModal';

interface TaxModuleProps {
    data: {
        vatCollected: number;
        vatDeductible: number;
        estimatedLiability: number;
    };
    workspaceId?: string;
}

export const TaxModule: React.FC<TaxModuleProps> = ({ data, workspaceId }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { vatCollected, vatDeductible, estimatedLiability } = data;

    const [showForensicChat, setShowForensicChat] = React.useState(false);
    const isPositive = estimatedLiability > 0;

    const handleDirectClose = () => {
        navigate('/finance/wizard');
    };

    return (
        <>
            <div className="glass-panel flex flex-col h-full min-h-[480px] p-6 sm:p-8 hover-lift relative overflow-hidden group shadow-sm border border-border-main">
                
                {/* Executive Header */}
                <div className="flex justify-between items-center border-b border-border-main pb-5 mb-6 flex-shrink-0">
                    <h2 className="text-sm font-black text-text-primary uppercase tracking-widest leading-none flex items-center gap-2">
                        <Landmark className="text-primary-start" size={20} />
                        {t('insights.tax.estimator', 'Vlerësimi i TVSH-së')}
                    </h2>
                    <button 
                        onClick={() => setShowForensicChat(true)} 
                        className="text-text-muted hover:text-primary-start transition-colors p-1 hover-lift shadow-sm" 
                        title="Hap Auditorin Forenzik"
                    >
                        <HelpCircle size={16} />
                    </button>
                </div>

                <div className="flex flex-col flex-1 min-h-0">
                    {/* Main Liability Box */}
                    <div className="border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 rounded-2xl p-6 mb-6 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/50 mb-2">
                            {t('insights.tax.toPay', 'Për të paguar (Vlerësim)')}
                        </p>
                        <h3 className={`text-3xl font-black tracking-tight ${isPositive ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            €{Math.abs(estimatedLiability).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6 flex-shrink-0">
                        <div className="border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 rounded-2xl p-4">
                            <div className="flex items-center gap-1.5 mb-1">
                                <TrendingUp size={12} className="text-emerald-600 dark:text-emerald-400" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/50">TVSH e Llogaritur</p>
                            </div>
                            <h3 className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                                €{vatCollected.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 rounded-2xl p-4">
                            <div className="flex items-center gap-1.5 mb-1">
                                <TrendingDown size={12} className="text-rose-600 dark:text-rose-400" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/50">TVSH Zbritshme</p>
                            </div>
                            <h3 className="text-3xl font-black tracking-tight text-rose-600 dark:text-rose-400">
                                €{vatDeductible.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-auto space-y-3 flex-shrink-0">
                        <button 
                            onClick={() => setShowForensicChat(true)}
                            className="w-full h-12 rounded-xl bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white hover:bg-white dark:hover:bg-white/10 transition-all backdrop-blur-sm font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                        >
                            Audito me AI
                        </button>
                        <button 
                            onClick={handleDirectClose} 
                            className="w-full h-12 rounded-xl bg-indigo-600 dark:bg-indigo-500/20 border border-indigo-600 dark:border-indigo-500/30 text-white dark:text-indigo-300 hover:bg-indigo-700 dark:hover:bg-indigo-500/30 transition-all font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3"
                        >
                            <Calculator size={16} />
                            {t('finance.monthlyClose', 'Mbyllja Mujore')}
                        </button>
                    </div>
                </div>
            </div>

            <ForensicAccountantModal isOpen={showForensicChat} onClose={() => setShowForensicChat(false)} workspaceId={workspaceId} />
        </>
    );
};