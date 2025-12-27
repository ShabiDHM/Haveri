import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Plane, CalendarDays, CloudSun, TrendingUp } from 'lucide-react';

export const ExternalFactorsCard: React.FC = () => {
    const { t } = useTranslation();

    // In a real scenario, this data comes from an external API (Weather, Calendar, Custom logic)
    const factors = [
        {
            icon: Plane,
            label: t('dashboard.diasporaSeason', 'Sezoni i Diasporës'),
            status: t('dashboard.statusPeak', 'PIKU (High)'),
            impact: "positive",
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20"
        },
        {
            icon: CalendarDays,
            label: t('dashboard.holidayNewYear', 'Viti i Ri (3 Ditë)'),
            status: t('dashboard.statusBuying', 'Blerje Masive'),
            impact: "positive",
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20"
        },
        {
            icon: CloudSun,
            label: t('dashboard.weatherToday', 'Moti Sot'),
            status: "-2°C (Ftohtë)",
            impact: "neutral",
            color: "text-gray-400",
            bg: "bg-gray-500/10",
            border: "border-gray-500/20"
        }
    ];

    return (
        <div className="bg-gray-900/50 border border-white/10 rounded-3xl p-6 h-full flex flex-col hover:border-blue-500/30 transition-colors duration-500">
            <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" /> {t('dashboard.contextIntelligence', 'Inteligjenca e Kontekstit')}
            </h3>
            
            <div className="space-y-3 flex-1">
                {factors.map((item, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-xl border ${item.border} ${item.bg}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-gray-900/50 ${item.color}`}>
                                <item.icon className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                                <p className="text-sm text-white font-bold">{item.status}</p>
                            </div>
                        </div>
                        {item.impact === 'positive' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                    </div>
                ))}
            </div>
        </div>
    );
};