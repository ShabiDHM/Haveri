// FILE: src/components/business/insights/TaxModule.tsx
// PHOENIX PROTOCOL - THEME-AWARE TAX MODULE (MATCHES SMARTAGENDACARD)

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
                
                {/* Header */}
                <div className="border-b border-border-main pb-5 mb-6 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-lg font-black uppercase tracking-widest text-text-primary flex items-center gap-2">
                        <Landmark className="text-primary-start" size={20} />
                        {t('insights.tax.estimator', 'Vlerësimi i TVSH-së')}
                    </h2>
                    <button 
                        onClick={() => setShowForensicChat(true)} 
                        className="text-text-muted hover:text-text-primary transition-colors p-1" 
                        title="Hap Auditorin Forenzik"
                    >
                        <HelpCircle size={16} />
                    </button>
                </div>

                {/* Main Liability Box */}
                <div className="glass-input p-6 mb-6 text-center border border-border-main bg-surface/30 backdrop-blur-sm rounded-2xl">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
                        {t('insights.tax.toPay', 'Për të paguar (Vlerësim)')}
                    </p>
                    <h3 className={`text-3xl font-black tracking-tight ${isPositive ? 'text-rose-600 dark:text-rose-400' : 'text-primary-start'}`}>
                        €{Math.abs(estimatedLiability).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6 flex-shrink-0">
                    <div className="glass-input p-4 border border-border-main bg-surface/30 backdrop-blur-sm rounded-2xl">
                        <div className="flex items-center gap-1.5 mb-1">
                            <TrendingUp size={12} className="text-primary-start" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">TVSH e Llogaritur</p>
                        </div>
                        <h3 className="text-3xl font-black tracking-tight text-primary-start">
                            €{vatCollected.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                    </div>
                    <div className="glass-input p-4 border border-border-main bg-surface/30 backdrop-blur-sm rounded-2xl">
                        <div className="flex items-center gap-1.5 mb-1">
                            <TrendingDown size={12} className="text-rose-500 dark:text-rose-400" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">TVSH Zbritshme</p>
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
                        className="w-full h-12 rounded-xl bg-input border border-border-main hover:bg-hover transition-all text-text-primary font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                    >
                        Audito me AI
                    </button>
                    <button 
                        onClick={handleDirectClose} 
                        className="w-full h-12 rounded-xl bg-input border border-border-main hover:bg-hover transition-all text-text-primary font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3"
                    >
                        <Calculator size={16} />
                        {t('finance.monthlyClose', 'Mbyllja Mujore')}
                    </button>
                </div>
            </div>

            <ForensicAccountantModal isOpen={showForensicChat} onClose={() => setShowForensicChat(false)} workspaceId={workspaceId} />
        </>
    );
};