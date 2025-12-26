// FILE: src/components/business/briefing/SmartAgendaCard.tsx
// PHOENIX PROTOCOL - MODULE V1.2 (FINAL LINT FIX)
// 1. CLEANUP: Removed unused React import.

import { useTranslation } from 'react-i18next';
import { Calendar, ArrowRight } from 'lucide-react';

export const SmartAgendaCard = ({ agenda }: any) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md h-full flex flex-col">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="text-blue-400" /> {t('briefing.agenda.title', 'Axhenda Intelligjente')}
            </h3>

            {agenda.isBusy ? (
                <div className="space-y-4">
                    {/* Map events here if it were real */}
                    <p>Displaying busy day events...</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm font-bold text-blue-300">{agenda.mission.generativeMission.recommendation.title}</p>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('briefing.observation', 'Vëzhgimi')}</p>
                        <p className="text-sm text-gray-300">{agenda.mission.generativeMission.observation}</p>
                    </div>
                     <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('briefing.implication', 'Implikimi')}</p>
                        <p className="text-sm text-gray-300">{agenda.mission.generativeMission.implication}</p>
                    </div>
                    <button className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                        {t('briefing.agenda.view_invoice', 'Shiko Faturën')} <ArrowRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};