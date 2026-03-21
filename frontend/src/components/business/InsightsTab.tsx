// FILE: frontend/src/components/business/InsightsTab.tsx
// PHOENIX PROTOCOL - INSIGHTS UI V2.0 (DESIGN SYSTEM ALIGNMENT)
// 1. REMOVED: Nexus Topology button and conditional rendering for graph mode.
// 2. UPDATED: Uses new design system CSS variables for light/dark theme compatibility.
// 3. STATUS: Cleaned of all graph references.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
    Loader2, 
    FileSpreadsheet, 
    ArrowLeft, 
    Cpu
} from 'lucide-react';
import { useBusinessIntelligence } from '../../hooks/useBusinessIntelligence';
import { useAuth } from '../../context/AuthContext';

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
    
    const [viewMode, setViewMode] = useState<'dashboard' | 'analyst'>('dashboard');


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

    const ViewHeader = ({ title, icon: Icon }: { title: string, icon: any }) => (
        <div className="flex items-center justify-between mb-4 bg-surface/50 backdrop-blur border border-border-main p-3 rounded-xl">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setViewMode('dashboard')} 
                    className="p-2 rounded-lg bg-surface hover:bg-hover text-text-muted hover:text-text-primary transition-all border border-border-main hover:border-border-main"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="h-6 w-px bg-border-main mx-1"></div>
                <div className="flex items-center gap-2 text-text-primary font-medium">
                    <Icon className="text-primary" size={20} />
                    <span>{title}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-[600px] text-text-primary">
            <AnimatePresence mode="wait">
                
                {/* --- MODE: ANALYST (SPREADSHEET) --- */}
                {viewMode === 'analyst' && (
                    <motion.div 
                        key="analyst" 
                        initial={{ opacity: 0, scale: 0.98 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.98 }} 
                        transition={{ duration: 0.3 }}
                    >
                        <ViewHeader title={t('analyst.smartDataAnalystTitle', 'Smart Data Analyst')} icon={FileSpreadsheet} />
                        <div className="bg-card border border-border-main rounded-2xl overflow-hidden shadow-xl relative">
                             <SpreadsheetAnalysisPanel />
                        </div>
                    </motion.div>
                )}

                {/* --- MODE: DASHBOARD (MAIN HUB) --- */}
                {viewMode === 'dashboard' && (
                    <motion.div 
                        key="dashboard" 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -20 }} 
                        className="space-y-8"
                    >
                        {/* Section 1: Advanced Tools Selection (only Analyst) */}
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                            
                            {/* Card: Analyst Button */}
                            <motion.button 
                                whileHover={{ scale: 1.02 }} 
                                whileTap={{ scale: 0.98 }} 
                                onClick={() => setViewMode('analyst')} 
                                className="relative overflow-hidden group rounded-2xl p-px bg-gradient-to-b from-primary/20 to-border-main text-left h-full"
                            >
                                <div className="absolute inset-0 bg-card rounded-2xl z-0" />
                                <div className="absolute inset-0 bg-grid-primary/[0.05] z-0" style={{ backgroundImage: 'radial-gradient(var(--primary) 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.1 }} />
                                
                                <div className="relative z-10 p-6 flex flex-col h-full justify-between">
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 group-hover:border-primary/50 transition-colors">
                                            <FileSpreadsheet className="text-primary" size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors">
                                                {t('analyst.smartDataAnalystTitle', 'Smart Analyst')}
                                            </h3>
                                            <p className="text-text-muted text-sm mt-1 leading-relaxed">
                                                {t('analyst.description', 'Deep dive into excel data with AI-powered anomaly detection.')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex items-center text-xs font-mono text-primary uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                        {t('analyst.initialize', 'Initialize Analysis')} <span className="ml-2">→</span>
                                    </div>
                                </div>
                            </motion.button>
                            
                            {/* Nexus button completely removed */}
                            
                        </div>
                        
                        {/* Section 2: Real-time Metrics (Modules) */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-text-muted mb-2">
                                <Cpu size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">{t('insights.liveMetrics')}</span>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <DebtModule data={debtAnalytics} />
                                <TaxModule data={taxAnalytics} />
                                <ProfitModule data={profitAnalytics} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};