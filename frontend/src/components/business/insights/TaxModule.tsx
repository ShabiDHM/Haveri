// FILE: src/components/business/insights/TaxModule.tsx
// PHOENIX PROTOCOL - TAX MODULE V5.0 (AUDITOR INTEGRATION)
// 1. ADDED: "Audito me AI" button to trigger the Forensic Accountant.
// 2. INTEGRATED: ForensicAccountantModal for specialized chat.
// 3. UI: Cleaned up and modernized the card layout.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Landmark, TrendingDown, TrendingUp, Calculator, HelpCircle, AlertTriangle, CheckCircle, Loader2, ScanSearch
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService, TaxAuditResult } from '../../../services/api';
import { ForensicAccountantModal } from './ForensicAccountantModal'; // PHOENIX: Imported new component

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

    // --- STATE MANAGEMENT ---
    const [showForensicChat, setShowForensicChat] = useState(false); // PHOENIX: New State
    const [showAudit, setShowAudit] = useState(false);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditResult, setAuditResult] = useState<TaxAuditResult | null>(null);

    // --- HANDLERS ---
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

    return (
        <>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md h-auto lg:h-[540px] flex flex-col relative overflow-hidden group hover:border-white/20 transition-all duration-500">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-6 flex-shrink-0 relative z-10">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Landmark className="text-blue-400" /> {t('insights.tax.estimator', 'Vlerësimi i TVSH-së')}
                    </h3>
                    <button 
                        onClick={() => setShowForensicChat(true)} 
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-blue-300 transition-colors" 
                        title="Hap Auditorin Forenzik"
                    >
                        <HelpCircle size={20} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col justify-center relative z-10">
                    <div className="relative pt-4 pb-8 text-center">
                        <p className="text-gray-400 text-sm mb-1">{t('insights.tax.toPay', 'Për të paguar (Vlerësim)')}</p>
                        <h2 className={`text-4xl font-bold tracking-tight ${estimatedLiability > 0 ? 'text-white' : 'text-emerald-400'}`}>
                            €{Math.abs(estimatedLiability).toFixed(2)}
                        </h2>
                        {estimatedLiability < 0 && <span className="text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20 mt-2 inline-block">Kredi Tatimore</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-2"><TrendingUp size={14} /> TVSH e Mbledhur</div>
                            <p className="text-xl font-mono text-white">€{vatCollected.toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase mb-2"><TrendingDown size={14} /> TVSH e Zbritshme</div>
                            <p className="text-xl font-mono text-white">€{vatDeductible.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* ACTION BUTTONS (The Pre-Flight Check) */}
                    <div className="px-4 space-y-3">
                        {/* PHOENIX: The new Auditor Button */}
                        <button 
                            onClick={() => setShowForensicChat(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-blue-300 font-bold rounded-xl transition-all active:scale-95 group"
                        >
                            <ScanSearch size={18} className="text-blue-400" />
                            Audito me AI
                        </button>

                        <button 
                            onClick={handleMonthlyCloseClick} 
                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 group"
                        >
                            <Calculator size={18} className="group-hover:rotate-12 transition-transform"/>
                            {t('finance.monthlyClose', 'Mbyllja Mujore')}
                        </button>
                    </div>
                </div>
                
                <p className="text-[10px] text-gray-500 mt-auto text-center italic border-t border-white/5 pt-3 flex-shrink-0 relative z-10">
                    * {t('insights.tax.disclaimer', 'Ky është vetëm një vlerësim. Konsultohuni me kontabilistin tuaj.')}
                </p>

                {/* Ambient Background */}
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
            </div>

            {/* --- MODAL 1: THE NEW FORENSIC ACCOUNTANT --- */}
            <ForensicAccountantModal isOpen={showForensicChat} onClose={() => setShowForensicChat(false)} />

            {/* --- MODAL 2: LEGACY MOCK AUDIT (Still used for Monthly Close wizard) --- */}
            <AnimatePresence>
                {showAudit && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative">
                            <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500" />
                            <div className="p-6">
                                {auditLoading ? (
                                    <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
                                        <Loader2 size={48} className="animate-spin text-blue-500" />
                                        <div><h3 className="text-xl font-bold text-white">Duke analizuar transaksionet...</h3><p className="text-gray-400 text-sm">AI po kontrollon faturat për anomali ligjore.</p></div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-full ${auditResult?.status === 'CLEAR' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{auditResult?.status === 'CLEAR' ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}</div>
                                            <div><h3 className="text-xl font-bold text-white">{auditResult?.status === 'CLEAR' ? 'Gjithçka Duket Mirë' : 'U Zbuluan Anomali'}</h3><p className="text-sm text-gray-400">Raporti i Inteligjencës Artificiale</p></div>
                                        </div>
                                        <div className="bg-black/30 rounded-xl p-4 border border-white/5 max-h-60 overflow-y-auto custom-scrollbar">
                                            {auditResult?.anomalies.map((note, idx) => (<div key={idx} className="flex gap-3 mb-3 last:mb-0 text-sm text-gray-300"><div className="min-w-[6px] w-[6px] h-[6px] rounded-full bg-amber-500 mt-1.5" /><p>{note}</p></div>))}
                                            {auditResult?.anomalies.length === 0 && (<p className="text-gray-500 italic text-center text-sm">Nuk u gjet asnjë problem. Jeni gati për mbyllje.</p>)}
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <button onClick={() => setShowAudit(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-colors">Rishiko sërish</button>
                                            <button onClick={() => navigate('/finance/wizard')} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/20 transition-all">{auditResult?.status === 'CLEAR' ? 'Vazhdo te Mbyllja' : 'Injoro & Vazhdo'}</button>
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