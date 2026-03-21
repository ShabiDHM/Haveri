// FILE: src/components/business/insights/TaxModule.tsx
// PHOENIX PROTOCOL - TAX MODULE V12.0 (DIRECT NAVIGATION - AUDIT MODAL REMOVED)

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
}

export const TaxModule: React.FC<TaxModuleProps> = ({ data }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { vatCollected, vatDeductible, estimatedLiability } = data;

    const [showForensicChat, setShowForensicChat] = React.useState(false);
    const isPositive = estimatedLiability > 0;

    const handleDirectClose = () => {
        // Bypass audit modal, go straight to the wizard
        navigate('/finance/wizard');
    };

    return (
        <>
            <div className={`bg-card border border-border-strong border-top-accent ${isPositive ? 'border-t-danger' : 'border-t-success'} rounded-2xl flex flex-col h-full min-h-[480px] max-h-[600px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative`}>
                
                <div className="p-5 flex-shrink-0">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                            <Landmark className="text-primary" size={20} /> 
                            {t('insights.tax.estimator', 'Vlerësimi i TVSH-së')}
                        </h3>
                        <button 
                            onClick={() => setShowForensicChat(true)} 
                            className="p-2 bg-surface hover:bg-hover rounded-lg text-primary transition-colors border border-border-strong" 
                            title="Hap Auditorin Forenzik"
                        >
                            <HelpCircle size={18} />
                        </button>
                    </div>

                    <div className="text-center mb-5 p-4 bg-surface/30 rounded-xl border border-border-strong">
                        <p className="text-xs text-text-muted mb-1">{t('insights.tax.toPay', 'Për të paguar (Vlerësim)')}</p>
                        <h2 className={`text-3xl font-bold tracking-tight ${isPositive ? 'text-danger' : 'text-success-start'}`}>
                            €{Math.abs(estimatedLiability).toFixed(2)}
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 bg-success-start/5 border border-success-start/20 rounded-xl text-center">
                            <div className="flex items-center justify-center gap-1 text-success-start text-xs font-bold uppercase mb-1"><TrendingUp size={12} /> TVSH Mbledhur</div>
                            <p className="text-lg font-mono font-bold text-text-primary">€{vatCollected.toFixed(2)}</p>
                        </div>
                        <div className="p-3 bg-danger/5 border border-danger/20 rounded-xl text-center">
                            <div className="flex items-center justify-center gap-1 text-danger text-xs font-bold uppercase mb-1"><TrendingDown size={12} /> TVSH Zbritshme</div>
                            <p className="text-lg font-mono font-bold text-text-primary">€{vatDeductible.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3 custom-scrollbar">
                    <button 
                        onClick={() => setShowForensicChat(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-surface hover:bg-hover border border-border-strong hover:border-primary/30 text-primary font-semibold rounded-xl transition-all"
                    >
                        Audito me AI
                    </button>

                    <button 
                        onClick={handleDirectClose} 
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                    >
                        <Calculator size={18} />
                        {t('finance.monthlyClose', 'Mbyllja Mujore')}
                    </button>
                </div>
            </div>

            <ForensicAccountantModal isOpen={showForensicChat} onClose={() => setShowForensicChat(false)} />
        </>
    );
};