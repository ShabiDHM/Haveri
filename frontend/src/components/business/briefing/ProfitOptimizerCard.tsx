// FILE: src/components/business/briefing/ProfitOptimizerCard.tsx
// PHOENIX PROTOCOL - MODULE V1.0 (PROFIT OPTIMIZER)

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Copy } from 'lucide-react';

export const ProfitOptimizerCard = ({ memo }: any) => {
    const { t } = useTranslation();
    const copyToClipboard = () => navigator.clipboard.writeText(memo.recommendation.social_post);

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md h-full flex flex-col">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="text-amber-400" /> {t('briefing.profit.title', 'Optimizimi i Fitimit')}
            </h3>
            <div className="space-y-4 text-sm">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('briefing.observation', 'Vëzhgimi')}</p>
                    <p className="text-gray-300">{memo.observation}</p>
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('briefing.implication', 'Implikimi')}</p>
                    <p className="text-gray-300">{memo.implication}</p>
                </div>
                <div className="border-t border-amber-500/20 pt-3">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">{memo.recommendation.title}</p>
                    <p className="text-gray-300 italic">"{memo.recommendation.script}"</p>
                    {memo.recommendation.social_post && (
                        <button onClick={copyToClipboard} className="mt-3 w-full text-left text-xs p-2 bg-black/30 rounded-lg hover:bg-black/50 border border-white/10 flex items-start gap-2">
                            <Copy size={14} className="text-gray-500 shrink-0 mt-0.5" />
                            <span className="text-gray-400">{memo.recommendation.social_post}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};