// FILE: src/components/business/insights/TaxModule.tsx
// PHOENIX PROTOCOL - TAX MODULE V13.0 (GLASSMORPHISM ALIGNED)

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
            <div className="glass-panel flex flex-col h-full min-h-[480px] p-6 sm:p-8 hover-lift relative overflow-hidden group">
                
                {/* Executive Header */}
                <div className="flex justify-between items-center border-b border-border-main pb-5 mb-6 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <Landmark className="text-primary-start" size={20} /> 
                        <h2 className="text-sm font-black text-text-primary uppercase tracking-widest leading-none">
                            {t('insights.tax.estimator', 'Vlerësimi i TVSH-së')}
                        </h2>
                    </div>
                    <button 
                        onClick={() => setShowForensicChat(true)} 
                        className="text-text-muted hover:text-primary-start transition-colors p-1" 
                        title="Hap Auditorin Forenzik"
                    >
                        <HelpCircle size={16} />
                    </button>
                </div>

                <div className="flex flex-col flex-1 min-h-0">
                    {/* Main Value Box */}
                    <div className="glass-input p-6 mb-4 flex-shrink-0 text-center flex flex-col justify-center items-center relative overflow-hidden">
                        <p className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-2 relative z-10">
                            {t('insights.tax.toPay', 'Për të paguar (Vlerësim)')}
                        </p>
                        <h2 className={`text-4xl font-mono font-black tracking-tight relative z-10 ${isPositive ? 'text-danger' : 'text-success-start'}`}>
                            €{Math.abs(estimatedLiability).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                    </div>

                    {/* Secondary Values Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6 flex-shrink-0">
                        <div className="glass-input p-4 text-center group/item hover:border-success-start/30 transition-colors">
                            <div className="flex items-center justify-center gap-1.5 text-[9px] text-success-start uppercase font-black tracking-widest mb-2">
                                <TrendingUp size={12} /> TVSH Mbledhur
                            </div>
                            <p className="text-sm font-mono font-black text-text-primary">
                                €{vatCollected.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="glass-input p-4 text-center group/item hover:border-danger/30 transition-colors">
                            <div className="flex items-center justify-center gap-1.5 text-[9px] text-danger uppercase font-black tracking-widest mb-2">
                                <TrendingDown size={12} /> TVSH Zbritshme
                            </div>
                            <p className="text-sm font-mono font-black text-text-primary">
                                €{vatDeductible.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons pushed to bottom */}
                    <div className="mt-auto space-y-3 flex-shrink-0">
                        <button 
                            onClick={() => setShowForensicChat(true)}
                            className="glass-input w-full h-12 flex items-center justify-center gap-2 hover:bg-white/5 transition-colors group/btn"
                        >
                            <span className="text-[10px] text-primary-start uppercase font-black tracking-widest group-hover/btn:scale-105 transition-transform">
                                Audito me AI
                            </span>
                        </button>

                        <button 
                            onClick={handleDirectClose} 
                            className="btn-primary w-full h-12 flex items-center justify-center gap-3"
                        >
                            <Calculator size={16} />
                            <span className="text-[10px] uppercase font-black tracking-widest">
                                {t('finance.monthlyClose', 'Mbyllja Mujore')}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <ForensicAccountantModal isOpen={showForensicChat} onClose={() => setShowForensicChat(false)} />
        </>
    );
};