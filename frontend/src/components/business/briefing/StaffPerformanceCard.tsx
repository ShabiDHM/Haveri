import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Trophy, TrendingUp, User, MessageCircle, Activity } from 'lucide-react';

// CORRECTED: This interface now matches the structure from src/data/types.ts
interface StaffData {
    efficiencyStatus: 'sleep' | 'stable' | 'fire';
    efficiencyScore: number;
    mvpName: string;
    mvpTotal: number;
    mvpInsight: {
        key: string;
        values?: Record<string, string | number>;
    };
    actionBravo: boolean;
}

export const StaffPerformanceCard: React.FC<{ data?: StaffData }> = ({ data }) => {
    const { t } = useTranslation();

    const stats: StaffData = data || {
        efficiencyStatus: 'stable',
        efficiencyScore: 0,
        mvpName: '...',
        mvpTotal: 0,
        mvpInsight: { key: 'analyzing' }, // Correct fallback structure
        actionBravo: false
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'fire': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
            case 'stable': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
        }
    };

    const handleWhatsApp = () => {
        const text = t('briefing.staff.bravo_message', { name: stats.mvpName, total: stats.mvpTotal });
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };
    
    // NEW: Function to correctly render translated insight text
    const renderInsight = () => {
        return t(`briefing.staff.insight.${stats.mvpInsight.key}`, stats.mvpInsight.values);
    };

    return (
        <motion.div 
            whileHover={{ scale: 1.02 }}
            className="h-full bg-gray-900/50 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/30 transition-all duration-500"
        >
            <div className={`absolute top-0 left-0 p-24 ${stats.efficiencyStatus === 'fire' ? 'bg-amber-500/10' : 'bg-blue-500/10'} blur-[90px] rounded-full pointer-events-none transition-all`} />

            <div className="flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${getStatusColor(stats.efficiencyStatus)}`}><Activity className="w-5 h-5" /></div>
                    <div>
                        <h3 className="text-white font-bold text-lg">{t('briefing.staff.title')}</h3>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${stats.efficiencyStatus === 'fire' ? 'bg-amber-400 animate-pulse' : 'bg-blue-400'}`} />
                            <p className="text-gray-400 text-xs uppercase tracking-wider">{t(`briefing.staff.status_${stats.efficiencyStatus}`)}</p>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-black text-white">{stats.efficiencyScore}%</span>
                    <p className="text-[10px] text-gray-500">{t('briefing.staff.efficiency')}</p>
                </div>
            </div>

            <div className="mt-6 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-2xl p-4 border border-white/5 flex items-center gap-4 z-10">
                <div className="relative">
                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center border-2 border-amber-400/50">
                        <User className="w-6 h-6 text-gray-300" />
                    </div>
                    <div className="absolute -bottom-2 -right-1 bg-amber-400 text-gray-900 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-gray-900">
                        {t('briefing.staff.mvp_badge')}
                    </div>
                </div>
                <div className="flex-1">
                    <h4 className="text-white font-bold">{stats.mvpName}</h4>
                    <p className="text-amber-300 text-sm font-bold">€{stats.mvpTotal} <span className="text-gray-500 text-xs font-normal">/ {t('briefing.staff.today')}</span></p>
                </div>
                <div><Trophy className="w-6 h-6 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" /></div>
            </div>

            <div className="space-y-3 mt-4 z-10">
                <p className="text-xs text-gray-400 flex items-start gap-2">
                    <TrendingUp className="w-3 h-3 text-emerald-400 mt-0.5" />
                    {renderInsight()}
                </p>
                {stats.actionBravo && (
                    <button 
                        onClick={handleWhatsApp}
                        className="w-full py-2.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 text-sm font-medium text-[#25D366] flex items-center justify-center gap-2 transition-all"
                    >
                        <MessageCircle className="w-4 h-4" />
                        {t('briefing.staff.send_bravo')}
                    </button>
                )}
            </div>
        </motion.div>
    );
};