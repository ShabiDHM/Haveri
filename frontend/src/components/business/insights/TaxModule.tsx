// FILE: src/components/business/insights/TaxModule.tsx
// PHOENIX PROTOCOL - TAX MODULE V13.5 (FULL-STACK UI HARMONIZATION)

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
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all duration-300 h-full flex flex-col min-h-[480px] hover-lift group">
                
                {/* Executive Header */}
                <div className="flex justify-between items-center border-b border-white/10 pb-5 mb-6 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <Landmark className="text-primary-start" size={20} /> 
                        <h2 className="text-sm font-black text-text-primary uppercase tracking-widest leading-none">
                            {t('insights.tax.estimator', 'Vlerësimi i TVSH-së')}
                        </h2>
                    </div>
                    <button 
                        onClick={() => setShowForensicChat(true)} 
                        className="text-text-muted hover:text-primary-start transition-colors p-1 hover-lift shadow-sm" 
                        title="Hap Auditorin Forenzik"
                    >
                        <HelpCircle size={16} />
                    </button>
                </div>

                <div className="flex flex-col flex-1 min-h-0">
                    {/* Main Value Box - Për të paguar */}
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-6 mb-4 flex-shrink-0 text-center flex flex-col justify-center items-center shadow-sm">
                        <p className="text-xs text-text-muted uppercase font-black tracking-widest mb-2 relative z-10">
                            {t('insights.tax.toPay', 'Për të paguar (Vlerësim)')}
                        </p>
                        <h2 className={`text-4xl font-mono font-black tracking-tight relative z-10 ${isPositive ? 'text-danger-start' : 'text-success-start'}`}>
                            €{Math.abs(estimatedLiability).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                    </div>

                    {/* Secondary Values Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6 flex-shrink-0">
                        {/* VAT Collected Card - Emerald accent line */}
                        <div className="relative rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 text-center group/item hover:border-success-start/30 transition-all hover-lift shadow-sm">
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500/60 rounded-b-xl"></div>
                            <div className="flex items-center justify-center gap-1.5 text-xs text-success-start uppercase font-black tracking-widest mb-2">
                                <TrendingUp size={12} /> TVSH e Llogaritur
                            </div>
                            <p className="text-sm font-mono font-black text-text-primary">
                                €{vatCollected.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        {/* VAT Deductible Card - Rose accent line */}
                        <div className="relative rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 text-center group/item hover:border-danger-start/30 transition-all hover-lift shadow-sm">
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500/60 rounded-b-xl"></div>
                            <div className="flex items-center justify-center gap-1.5 text-xs text-danger-start uppercase font-black tracking-widest mb-2">
                                <TrendingDown size={12} /> TVSH Zbritshme
                            </div>
                            <p className="text-sm font-mono font-black text-text-primary">
                                €{vatDeductible.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-auto space-y-3 flex-shrink-0">
                        <button 
                            onClick={() => setShowForensicChat(true)}
                            className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-md w-full h-12 flex items-center justify-center gap-2 hover:bg-white/10 transition-colors group/btn hover:border-primary-start/50 hover-lift shadow-sm"
                        >
                            <span className="text-xs text-primary-start uppercase font-black tracking-widest group-hover/btn:scale-105 transition-transform">
                                Audito me AI
                            </span>
                        </button>

                        <button 
                            onClick={handleDirectClose} 
                            className="btn-primary w-full h-12 flex items-center justify-center gap-3 hover-lift shadow-sm"
                        >
                            <Calculator size={16} />
                            <span className="text-xs uppercase font-black tracking-widest">
                                {t('finance.monthlyClose', 'Mbyllja Mujore')}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <ForensicAccountantModal isOpen={showForensicChat} onClose={() => setShowForensicChat(false)} workspaceId={workspaceId} />
        </>
    );
};