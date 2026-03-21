// FILE: src/components/business/insights/TaxModule.tsx
// PHOENIX PROTOCOL - TAX MODULE V7.0 (ENHANCED BORDERS & COLORS)
// 1. ADDED: Colored top accent bar for better visual hierarchy
// 2. ENHANCED: Cards now have stronger borders and hover effects

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Landmark, TrendingDown, TrendingUp, Calculator, HelpCircle, AlertTriangle, CheckCircle, Loader2, ScanSearch
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService, TaxAuditResult } from '../../../services/api';
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

    const [showForensicChat, setShowForensicChat] = useState(false);
    const [showAudit, setShowAudit] = useState(false);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditResult, setAuditResult] = useState<TaxAuditResult | null>(null);

    const handleMonthlyCloseClick = async () => {
        setShowAudit(true);
        setAuditLoading(true);
        try {
            const today = new Date();
            const result = await apiService.analyzeTaxAnomalies(today.getMonth() + 1, today.getFullYear());
            setAuditResult(result);
        } catch (error) {
            navigate('/finance/wizard');
        } finally {
            setAuditLoading(false);
        }
    };

    const isPositive = estimatedLiability > 0;

    return (
        <>
            <div className="bg-surface/50 border border-border-main rounded-2xl p-6 backdrop-blur-md h-auto lg:h-[540px] flex flex-col relative overflow-hidden group hover:border-primary/30 transition-all duration-500 shadow-sm">
                {/* Colored top accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isPositive ? 'from-danger to-danger/60' : 'from-success-start to-success-start/60'}`} />
                
                {/* Header */}
                <div className="flex justify-between items-start mb-6 flex-shrink-0 relative z-10">
                    <h3 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <Landmark className="text-primary" /> {t('insights.tax.estimator', 'Vlerësimi i TVSH-së')}
                    </h3>
                    <button 
                        onClick={() => setShowForensicChat(true)} 
                        className="p-2 bg-surface hover:bg-hover rounded-full text-primary transition-colors border border-border-main hover:border-primary/30" 
                        title="Hap Auditorin Forenzik"
                    >
                        <HelpCircle size={20} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col justify-center relative z-10">
                    <div className="relative pt-4 pb-8 text-center bg-surface/30 rounded-xl border border-border-main mb-4">
                        <p className="text-text-muted text-sm mb-1">{t('insights.tax.toPay', 'Për të paguar (Vlerësim)')}</p>
                        <h2 className={`text-4xl font-bold tracking-tight ${isPositive ? 'text-danger' : 'text-success-start'}`}>
                            €{Math.abs(estimatedLiability).toFixed(2)}
                        </h2>
                        {!isPositive && estimatedLiability < 0 && (
                            <span className="text-xs text-success-start bg-success-start/10 px-2 py-1 rounded-full border border-success-start/20 mt-2 inline-block">Kredi Tatimore</span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-success-start/5 border border-success-start/20 rounded-xl hover:border-success-start/40 transition-all">
                            <div className="flex items-center gap-2 text-success-start text-xs font-bold uppercase mb-2"><TrendingUp size={14} /> TVSH e Mbledhur</div>
                            <p className="text-xl font-mono text-text-primary font-bold">€{vatCollected.toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-danger/5 border border-danger/20 rounded-xl hover:border-danger/40 transition-all">
                            <div className="flex items-center gap-2 text-danger text-xs font-bold uppercase mb-2"><TrendingDown size={14} /> TVSH e Zbritshme</div>
                            <p className="text-xl font-mono text-text-primary font-bold">€{vatDeductible.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="px-4 space-y-3">
                        <button 
                            onClick={() => setShowForensicChat(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-surface hover:bg-hover border border-border-main hover:border-primary/30 text-primary font-bold rounded-xl transition-all active:scale-95 group"
                        >
                            <ScanSearch size={18} className="text-primary" />
                            Audito me AI
                        </button>

                        <button 
                            onClick={handleMonthlyCloseClick} 
                            className="btn-primary w-full flex items-center justify-center gap-2 py-3 active:scale-95 group"
                        >
                            <Calculator size={18} className="group-hover:rotate-12 transition-transform"/>
                            {t('finance.monthlyClose', 'Mbyllja Mujore')}
                        </button>
                    </div>
                </div>
                
                <p className="text-[10px] text-text-muted mt-auto text-center italic border-t border-border-main pt-3 flex-shrink-0 relative z-10">
                    * {t('insights.tax.disclaimer', 'Ky është vetëm një vlerësim. Konsultohuni me kontabilistin tuaj.')}
                </p>

                {/* Ambient Background */}
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
            </div>

            {/* MODAL 1: FORENSIC ACCOUNTANT */}
            <ForensicAccountantModal isOpen={showForensicChat} onClose={() => setShowForensicChat(false)} />

            {/* MODAL 2: LEGACY MOCK AUDIT (Monthly Close wizard) */}
            <AnimatePresence>
                {showAudit && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-glass backdrop-blur-xl border border-border-main rounded-2xl w-full max-w-lg shadow-xl overflow-hidden relative">
                            <div className="h-1 w-full bg-gradient-to-r from-primary to-primary" />
                            <div className="p-6">
                                {auditLoading ? (
                                    <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
                                        <Loader2 size={48} className="animate-spin text-primary" />
                                        <div><h3 className="text-xl font-bold text-text-primary">Duke analizuar transaksionet...</h3><p className="text-text-muted text-sm">AI po kontrollon faturat për anomali ligjore.</p></div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-border-main">
                                            <div className={`p-3 rounded-full ${auditResult?.status === 'CLEAR' ? 'bg-success-start/20 text-success-start border border-success-start/30' : 'bg-warning-start/20 text-warning-start border border-warning-start/30'}`}>{auditResult?.status === 'CLEAR' ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}</div>
                                            <div><h3 className="text-xl font-bold text-text-primary">{auditResult?.status === 'CLEAR' ? 'Gjithçka Duket Mirë' : 'U Zbuluan Anomali'}</h3><p className="text-sm text-text-muted">Raporti i Inteligjencës Artificiale</p></div>
                                        </div>
                                        <div className="bg-surface rounded-xl p-4 border border-border-main max-h-60 overflow-y-auto custom-scrollbar shadow-inner">
                                            {auditResult?.anomalies.map((note, idx) => (<div key={idx} className="flex gap-3 mb-3 last:mb-0 text-sm text-text-secondary p-2 border-b border-border-main last:border-0"><div className="min-w-[6px] w-[6px] h-[6px] rounded-full bg-warning-start mt-1.5" /><p>{note}</p></div>))}
                                            {auditResult?.anomalies.length === 0 && (<p className="text-text-muted italic text-center text-sm py-4">Nuk u gjet asnjë problem. Jeni gati për mbyllje.</p>)}
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <button onClick={() => setShowAudit(false)} className="flex-1 py-3 rounded-xl bg-surface hover:bg-hover text-text-secondary font-medium transition-colors border border-border-main">Rishiko sërish</button>
                                            <button onClick={() => navigate('/finance/wizard')} className="flex-1 py-3 rounded-xl btn-primary transition-all">{auditResult?.status === 'CLEAR' ? 'Vazhdo te Mbyllja' : 'Injoro & Vazhdo'}</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};