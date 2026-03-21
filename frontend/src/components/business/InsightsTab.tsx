// FILE: frontend/src/components/business/InsightsTab.tsx
// PHOENIX PROTOCOL - INSIGHTS UI V4.0 (UNIFIED ADMIN AESTHETIC)
// UPDATED: Uses Panel component, unified border styling

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
    Loader2, 
    FileSpreadsheet, 
    Cpu,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { useBusinessIntelligence } from '../../hooks/useBusinessIntelligence';
import { useAuth } from '../../context/AuthContext';
import { Panel } from '../ui/Panel';

// Modules
import { DebtModule } from './insights/DebtModule';
import { TaxModule } from './insights/TaxModule';
import { ProfitModule } from './insights/ProfitModule';

// Component Imports
import SpreadsheetAnalysisPanel from '../SpreadsheetAnalysisPanel';

export const InsightsTab: React.FC = () => {
    const { t } = useTranslation();
    useAuth();
    const { loading, debtAnalytics, profitAnalytics, taxAnalytics } = useBusinessIntelligence();
    
    const [showAnalystPanel, setShowAnalystPanel] = useState(false);

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-96 space-y-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                    <Loader2 className="w-12 h-12 animate-spin text-primary relative z-10" />
                </div>
                <span className="text-text-muted font-mono text-sm tracking-widest animate-pulse">LOADING INTELLIGENCE...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Hero Section - Analyst Panel Toggle - Added unified accent bar logic */}
            <Panel className="p-5 relative overflow-hidden">
                {/* Colored top accent bar - Primary color for Data Analyst */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/80 z-10 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                
                <div className="flex items-center justify-between flex-wrap gap-4 relative z-20">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <FileSpreadsheet className="text-primary" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-text-primary">
                                {t('analyst.smartDataAnalystTitle', 'Analisti i të Dhënave')}
                            </h2>
                            <p className="text-sm text-text-muted">
                                {t('analyst.description', 'Merrni analiza të thelluara të të dhënave Excel me zbulim anomalish të fuqizuar nga AI.')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAnalystPanel(!showAnalystPanel)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-hover border border-border-strong transition-all"
                    >
                        {showAnalystPanel ? (
                            <>
                                <ChevronUp size={18} />
                                <span className="text-sm font-medium">{t('insights.hideAnalysis', 'Fshih Analizën')}</span>
                            </>
                        ) : (
                            <>
                                <ChevronDown size={18} />
                                <span className="text-sm font-medium">{t('insights.showAnalysis', 'Hap Analizën')}</span>
                            </>
                        )}
                    </button>
                </div>
            </Panel>

            {/* Expandable Analyst Panel */}
            <AnimatePresence>
                {showAnalystPanel && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <SpreadsheetAnalysisPanel />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Live Metrics Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-text-muted">
                    <Cpu size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">{t('insights.liveMetrics')}</span>
                </div>
                
                {/* 3-Column Grid for Metric Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <DebtModule data={debtAnalytics} />
                    <TaxModule data={taxAnalytics} />
                    <ProfitModule data={profitAnalytics} />
                </div>
            </div>
        </div>
    );
};