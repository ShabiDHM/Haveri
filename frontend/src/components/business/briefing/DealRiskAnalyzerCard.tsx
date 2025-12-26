// FILE: src/components/business/briefing/DealRiskAnalyzerCard.tsx
// PHOENIX PROTOCOL - MODULE V1.3 (FINAL LINT FIX)
// 1. CLEANUP: Removed unused React import.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, BrainCircuit } from 'lucide-react';

export const DealRiskAnalyzerCard = ({ initialData }: any) => {
    const { t } = useTranslation();
    const [amount, setAmount] = useState(5000);
    const [term, setTerm] = useState(90);
    const [analysis, setAnalysis] = useState<any>(null);

    const handleAnalyze = () => {
        const totalReceivables = initialData.currentReceivables + amount;
        const requiredCash = initialData.monthlyFixedCosts * (term / 30);
        const riskLevel = totalReceivables > requiredCash ? 'Lartë' : 'Mesatar';

        setAnalysis({
            totalReceivables,
            requiredCash,
            riskLevel
        });
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md h-full flex flex-col">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="text-red-400" /> {t('briefing.deal_risk.title', 'Analizuesi i Riskut')}
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="text-xs text-gray-400 block mb-1">{t('briefing.deal_risk.amount', 'Shuma e Ofertës')}</label>
                    <input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} className="w-full bg-black/20 p-2 rounded-lg border border-white/10 text-white" />
                </div>
                <div>
                    <label className="text-xs text-gray-400 block mb-1">{t('briefing.deal_risk.term', 'Afati (Ditë)')}</label>
                    <input type="number" value={term} onChange={e => setTerm(parseInt(e.target.value))} className="w-full bg-black/20 p-2 rounded-lg border border-white/10 text-white" />
                </div>
            </div>
            <button onClick={handleAnalyze} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                <BrainCircuit size={16} /> {t('briefing.deal_risk.analyze', 'Analizo Riskun')}
            </button>
            
            {analysis && (
                <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
                    <p className="text-xs text-gray-400">{t('briefing.deal_risk.implication', 'Implikimi: Kjo marrëveshje do të rrisë borxhet e arkëtueshme në')} <span className="text-white font-bold">€{analysis.totalReceivables.toFixed(2)}</span>, {t('briefing.deal_risk.while', 'ndërkohë që shpenzimet tuaja për këtë periudhë janë rreth')} <span className="text-white font-bold">€{analysis.requiredCash.toFixed(2)}</span>.</p>
                    <p className="p-2 text-center font-bold rounded-lg" style={{ background: analysis.riskLevel === 'Lartë' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)', color: analysis.riskLevel === 'Lartë' ? '#f87171' : '#facc15' }}>
                        {t('briefing.deal_risk.risk_level', 'Niveli i Rrezikut')}: {analysis.riskLevel}
                    </p>
                    <p className="text-xs text-gray-300 font-bold mt-2">{t('briefing.deal_risk.recommendation', 'Rekomandim:')} <span className="font-normal text-gray-400">{t('briefing.deal_risk.rec_text', 'Kërkoni pagesë paraprake ose ofroni zbritje për pagesë të shpejtë.')}</span></p>
                </div>
            )}
        </div>
    );
};