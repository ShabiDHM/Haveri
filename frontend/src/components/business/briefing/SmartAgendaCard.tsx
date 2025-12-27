import React from 'react';
import { useNavigate } from 'react-router-dom'; // PHOENIX: Added navigation hook
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

// Interface defining the agenda structure
interface AgendaItem {
    id: string;
    title: string;
    time: string;
    priority: 'high' | 'medium' | 'low';
    isCompleted: boolean;
}

interface SmartAgendaCardProps {
    agenda?: AgendaItem[];
}

export const SmartAgendaCard: React.FC<SmartAgendaCardProps> = ({ agenda }) => {
    const { t } = useTranslation();
    const navigate = useNavigate(); // PHOENIX: Initialize navigation

    // Default Fallback Data if API fails or is loading
    const defaultAgenda: AgendaItem[] = [
        { 
            id: '1', 
            title: t('dashboard.taskTax', 'Përgatit Deklarimin TVSH'), 
            time: '14:00', 
            priority: 'high', 
            isCompleted: false 
        },
        { 
            id: '2', 
            title: t('dashboard.taskSupplier', 'Porosia: Coca Cola'), 
            time: '15:30', 
            priority: 'medium', 
            isCompleted: false 
        },
        { 
            id: '3', 
            title: t('dashboard.taskReview', 'Mbyllja Ditore'), 
            time: '22:00', 
            priority: 'low', 
            isCompleted: false 
        }
    ];

    const displayAgenda = agenda || defaultAgenda;

    return (
        <div className="bg-gray-900/50 border border-white/10 rounded-3xl p-6 h-full flex flex-col hover:border-indigo-500/30 transition-colors duration-500">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" /> {t('dashboard.smartAgenda', 'Axhenda Inteligjente')}
                </h3>
                <span className="text-xs text-gray-500">{t('dashboard.priorityTasks', 'Prioritetet e ditës')}</span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {displayAgenda.map((item, index) => (
                    <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-gray-800/40 hover:bg-gray-800/80 transition-all cursor-pointer"
                    >
                        {/* Time Column */}
                        <div className="flex flex-col items-center min-w-[3rem] border-r border-white/10 pr-3">
                            <Clock className="w-3 h-3 text-gray-500 mb-1" />
                            <span className="text-xs font-mono text-gray-300">{item.time}</span>
                        </div>

                        {/* Content Column */}
                        <div className="flex-1">
                            <h4 className="text-sm text-gray-200 font-medium leading-tight group-hover:text-white transition-colors">
                                {item.title}
                            </h4>
                            {item.priority === 'high' && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-amber-500 font-semibold">
                                    <AlertCircle className="w-3 h-3" /> {t('common.urgent', 'Urgjente')}
                                </div>
                            )}
                        </div>

                        {/* Action Icon */}
                        <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <CheckCircle2 className="w-5 h-5 text-gray-600 hover:text-emerald-500 transition-colors" />
                        </div>
                    </motion.div>
                ))}
            </div>

            <button 
                onClick={() => navigate('/calendar')} // PHOENIX: Activated Logic
                className="w-full mt-4 py-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white text-sm font-medium transition-all flex items-center justify-center gap-2 border border-indigo-500/20"
            >
                {t('dashboard.viewCalendar', 'Shiko Kalendarin')}
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    );
};