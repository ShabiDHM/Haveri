// FILE: frontend/src/components/business/InsightsTab.tsx
// PHOENIX PROTOCOL - INSIGHTS TAB V2.1
// 1. FEATURE: 'Smart Analyst' Button (The Trigger).

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, FileSpreadsheet, Sparkles, ArrowLeft } from 'lucide-react';
import { useBusinessIntelligence } from '../../hooks/useBusinessIntelligence';

// Modules
import { DebtModule } from './insights/DebtModule';
import { TaxModule } from './insights/TaxModule';
import { ProfitModule } from './insights/ProfitModule';

// IMPORT THE NEW PANEL
import SpreadsheetAnalysisPanel from '../SpreadsheetAnalysisPanel'; 

export const InsightsTab: React.FC = () => {
    const { t } = useTranslation();
    const { loading, debtAnalytics, profitAnalytics, taxAnalytics } = useBusinessIntelligence();
    
    // STATE: This controls the View Switch
    const [isAnalystMode, setIsAnalystMode] = useState(false);

    if (loading) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-12 h-12 animate-spin text-primary-start" /></div>;

    return (
        <div className="space-y-6 pb-10 min-h-[600px]">
            <AnimatePresence mode="wait">
                
                {/* MODE 1: THE SMART ANALYST PANEL (Active when button is clicked) */}
                {isAnalystMode ? (
                    <motion.div 
                        key="analyst"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        className="space-y-4"
                    >
                        {/* Back Button to return to Dashboard */}
                        <button 
                            onClick={() => setIsAnalystMode(false)}
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group mb-2"
                        >
                            <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10">
                                <ArrowLeft size={18} />
                            </div>
                            <span className="font-medium">{t('general.backToDashboard', 'Kthehu tek Paneli Kryesor')}</span>
                        </button>

                        {/* The Component we just built */}
                        <div className="bg-gray-900/50 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                             <SpreadsheetAnalysisPanel />
                        </div>
                    </motion.div>
                ) : (
                    
                /* MODE 2: THE STANDARD DASHBOARD (Default) */
                    <motion.div 
                        key="dashboard"
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="space-y-8"
                    >
                        {/* --- THE TRIGGER BUTTON --- */}
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => setIsAnalystMode(true)}
                            className="w-full relative overflow-hidden group rounded-3xl text-left"
                        >
                            {/* Gradient Background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-indigo-900/80 to-purple-900/80 backdrop-blur-xl border border-white/10 group-hover:border-blue-500/50 transition-all duration-300"></div>
                            
                            {/* Button Content */}
                            <div className="relative p-6 sm:p-8 flex items-center justify-between">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                        <Sparkles className="text-blue-400 animate-pulse" />
                                        {t('analyst.title', 'Smart Data Analyst')}
                                    </h3>
                                    <p className="text-gray-300 max-w-xl">
                                        {t('analyst.desc', 'Keni një skedar Excel ose CSV të komplikuar? Ngarkojeni këtu dhe Inteligjenca Artificiale do ta analizojë, vizualizojë dhe gjejë anomali automatikisht.')}
                                    </p>
                                </div>
                                <div className="hidden sm:flex h-16 w-16 bg-blue-500/20 rounded-2xl items-center justify-center border border-blue-500/30 group-hover:bg-blue-500/30 transition-all">
                                    <FileSpreadsheet className="text-blue-300 h-8 w-8" />
                                </div>
                            </div>
                        </motion.button>
                        {/* --------------------------- */}

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