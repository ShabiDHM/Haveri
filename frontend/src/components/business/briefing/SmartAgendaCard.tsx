// FILE: src/components/business/briefing/SmartAgendaCard.tsx
// PHOENIX PROTOCOL - AGENDA V19.6 (INTERACTIVE)
// 1. UX: Clicking a 'Payment' task now redirects to Finance tab.
// 2. UX: Main button redirects to Calendar.

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, CheckCircle2, AlertCircle, ArrowRight, Phone, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AgendaItem {
    id: string;
    title: string;
    time: string;
    type: 'meeting' | 'payment' | 'deadline' | 'call';
    priority: 'high' | 'medium' | 'low';
    isCompleted: boolean;
}

interface SmartAgendaCardProps {
    agenda?: AgendaItem[] | any; 
}

export const SmartAgendaCard: React.FC<SmartAgendaCardProps> = ({ agenda }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const hasValidArray = Array.isArray(agenda) && agenda.length > 0;
    
    // Using Backend Data if available, otherwise Mocks
    const displayAgenda: AgendaItem[] = hasValidArray ? agenda : [
        { id: '1', title: t('briefing.agenda.mock_task_1'), time: '10:00', type: 'meeting', priority: 'high', isCompleted: false },
        { id: '2', title: t('briefing.agenda.mock_task_2'), time: '13:30', type: 'payment', priority: 'medium', isCompleted: false },
    ];

    const getIcon = (type: string) => {
        switch (type) {
            case 'call': return <Phone className="w-3 h-3" />;
            case 'payment': return <FileText className="w-3 h-3" />;
            default: return <Clock className="w-3 h-3" />;
        }
    };

    const handleItemClick = (type: string) => {
        if (type === 'payment') {
            navigate('/business/finance');
        } else {
            navigate('/calendar');
        }
    };

    return (
        <motion.div 
            whileHover={{ scale: 1.02 }}
            className="h-full bg-gray-900/50 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col relative overflow-hidden group hover:border-blue-500/30 transition-all duration-500"
        >
            <div className="absolute bottom-0 left-0 p-20 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-blue-500/20 transition-all" />

            <div className="flex items-center gap-3 mb-6 z-10">
                <div className="p-3 bg-blue-500/20 rounded-2xl">
                    <Calendar className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-lg">{t('briefing.agenda.title')}</h3>
                    <p className="text-gray-400 text-xs">{t('briefing.agenda.subtitle')}</p>
                </div>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto z-10 pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {displayAgenda.map((item) => (
                    <div 
                        key={item.id} 
                        onClick={() => handleItemClick(item.type)}
                        className="relative pl-4 border-l border-white/10 hover:border-blue-500/50 transition-colors group/item cursor-pointer"
                    >
                        <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${item.priority === 'high' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                        
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className={`text-sm font-medium ${item.isCompleted ? 'text-gray-500 line-through' : 'text-gray-200'} group-hover/item:text-blue-300 transition-colors`}>
                                    {item.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-mono text-gray-400 bg-gray-800/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        {getIcon(item.type)} {item.time}
                                    </span>
                                    {item.priority === 'high' && (
                                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> Urgent
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <button className="opacity-0 group-hover/item:opacity-100 p-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-all">
                                <CheckCircle2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 z-10">
                <button 
                    onClick={() => navigate('/calendar')}
                    className="w-full py-3 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-sm font-medium text-blue-300 flex items-center justify-center gap-2 transition-all group/btn"
                >
                    {t('briefing.agenda.view_full')} 
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
            </div>
        </motion.div>
    );
};