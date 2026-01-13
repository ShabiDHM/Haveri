// FILE: frontend/src/components/business/InsightsTab.tsx
// PHOENIX PROTOCOL - INSIGHTS TAB V3.1 (ICON FIX)
// 1. FIX: Restored the 'FileSpreadsheet' icon to the 'Smart Data Analyst' button.
// 2. STATUS: All UI elements are now correct and consistent with the previous design.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, FileSpreadsheet, Sparkles, ArrowLeft, Share2 } from 'lucide-react';
import { useBusinessIntelligence } from '../../hooks/useBusinessIntelligence';

// Modules
import { DebtModule } from './insights/DebtModule';
import { TaxModule } from './insights/TaxModule';
import { ProfitModule } from './insights/ProfitModule';

// Component Imports
import SpreadsheetAnalysisPanel from '../SpreadsheetAnalysisPanel'; 
import GraphVisualization from '../GraphVisualization';

export const InsightsTab: React.FC = () => {
    const { t } = useTranslation();
    const { loading, debtAnalytics, profitAnalytics, taxAnalytics } = useBusinessIntelligence();
    
    // State for view switching
    const [isAnalystMode, setIsAnalystMode] = useState(false);
    const [isGraphMode, setIsGraphMode] = useState(false);

    if (loading) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-primary-start" /></div>;

    const handleBackToDashboard = () => {
        setIsAnalystMode(false);
        setIsGraphMode(false);
    };

    return (
        <div className="space-y-6 pb-10 min-h-[600px]">
            <AnimatePresence mode="wait">
                
                {isAnalystMode ? (
                    <motion.div key="analyst" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="space-y-4">
                        <button onClick={handleBackToDashboard} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group mb-2">
                            <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10"><ArrowLeft size={18} /></div>
                            <span className="font-medium">{t('general.backToDashboard', 'Kthehu tek Paneli Kryesor')}</span>
                        </button>
                        <div className="bg-gray-900/50 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                             <SpreadsheetAnalysisPanel />
                        </div>
                    </motion.div>

                ) : isGraphMode ? (
                    <motion.div key="graph" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="space-y-4">
                        <button onClick={handleBackToDashboard} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group mb-2">
                            <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10"><ArrowLeft size={18} /></div>
                            <span className="font-medium">{t('general.backToDashboard', 'Kthehu tek Paneli Kryesor')}</span>
                        </button>
                        <div className="bg-gray-900/50 border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl">
                             <GraphVisualization />
                        </div>
                    </motion.div>

                ) : (
                    <motion.div key="dashboard" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-8">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Smart Analyst Button */}
                            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => setIsAnalystMode(true)} className="w-full relative overflow-hidden group rounded-3xl text-left p-6 sm:p-8 bg-gradient-to-r from-blue-900/80 via-indigo-900/80 to-purple-900/80 border border-white/10 hover:border-blue-500/50 transition-all duration-300 flex items-center justify-between">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-white flex items-center gap-3"><Sparkles className="text-blue-400" />{t('analyst.title', 'Smart Data Analyst')}</h3>
                                    <p className="text-gray-300 max-w-xl">{t('analyst.desc', 'Ngarkoni skedarë Excel/CSV për analizë të thelluar, vizualizim dhe zbulim të anomalive.')}</p>
                                </div>
                                {/* --- ICON RESTORED --- */}
                                <div className="hidden sm:flex h-16 w-16 bg-blue-500/20 rounded-2xl items-center justify-center border border-blue-500/30 group-hover:bg-blue-500/30 transition-all">
                                    <FileSpreadsheet className="text-blue-300 h-8 w-8" />
                                </div>
                            </motion.button>
                            
                            {/* Interconnected Intelligence Button */}
                            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => setIsGraphMode(true)} className="w-full relative overflow-hidden group rounded-3xl text-left p-6 sm:p-8 bg-gradient-to-r from-teal-900/80 via-emerald-900/80 to-green-900/80 border border-white/10 hover:border-teal-500/50 transition-all duration-300 flex items-center justify-between">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-white flex items-center gap-3"><Share2 className="text-teal-400" />{t('graph.title', 'Inteligjenca Ndërlidhëse')}</h3>
                                    <p className="text-gray-300 max-w-xl">{t('graph.desc', 'Eksploroni lidhjet e fshehura mes klientëve, faturave dhe shpenzimeve në një pamje vizuale interaktive.')}</p>
                                </div>
                                {/* Placeholder for a future icon if needed */}
                            </motion.button>
                        </div>
                        
                        {/* Existing Dashboard Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-fr">
                            <DebtModule data={debtAnalytics} />
                            <TaxModule data={taxAnalytics} />
                            <ProfitModule data={profitAnalytics} />
                        </div>

                        <div className="text-center text-gray-500 text-sm mt-8 border-t border-white/5 pt-6">
                            <p>💡 {t('insights.tip', 'Këshillë: Përdorni butonin WhatsApp tek borxhet për të përshpejtuar arkëtimin me 40%.')}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};