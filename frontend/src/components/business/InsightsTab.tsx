// FILE: frontend/src/components/business/InsightsTab.tsx
// PHOENIX PROTOCOL - INSIGHTS UI V1.1 (ADMIN ACCESS CONTROL)
// 1. IMPORT: Added 'useAuth' hook to access the current user's session data.
// 2. ACCESS CONTROL: The "Nexus Topology" card is now conditionally rendered ONLY if the user's role is 'ADMIN'.
// 3. RESPONSIVE UI: The grid layout dynamically adjusts from 2 columns to 1 for non-admin users to prevent empty space.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
    Loader2, 
    FileSpreadsheet, 
    ArrowLeft, 
    Cpu, 
    Network,
    Lock
} from 'lucide-react';
import { useBusinessIntelligence } from '../../hooks/useBusinessIntelligence';
import { useAuth } from '../../context/AuthContext'; // PHOENIX: Imported auth hook

// Modules
import { DebtModule } from './insights/DebtModule';
import { TaxModule } from './insights/TaxModule';
import { ProfitModule } from './insights/ProfitModule';

// Component Imports
import SpreadsheetAnalysisPanel from '../SpreadsheetAnalysisPanel'; 
import GraphVisualization from '../GraphVisualization';

export const InsightsTab: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth(); // PHOENIX: Get user data from context
    const { loading, debtAnalytics, profitAnalytics, taxAnalytics } = useBusinessIntelligence();
    
    const [viewMode, setViewMode] = useState<'dashboard' | 'analyst' | 'graph'>('dashboard');

    // PHOENIX: Check for admin role
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-96 space-y-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                    <Loader2 className="w-12 h-12 animate-spin text-blue-400 relative z-10" />
                </div>
                <span className="text-slate-400 font-mono text-sm tracking-widest animate-pulse">LOADING INTELLIGENCE...</span>
            </div>
        );
    }

    const ViewHeader = ({ title, icon: Icon }: { title: string, icon: any }) => (
        <div className="flex items-center justify-between mb-4 bg-slate-900/50 backdrop-blur border border-white/5 p-3 rounded-xl">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setViewMode('dashboard')} 
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700 hover:border-slate-600"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="h-6 w-px bg-slate-700 mx-1"></div>
                <div className="flex items-center gap-2 text-white font-medium">
                    <Icon className="text-blue-400" size={20} />
                    <span>{title}</span>
                </div>
            </div>
            {isAdmin && (
                 <div className="text-xs font-mono text-amber-400 uppercase tracking-widest hidden sm:flex items-center gap-2">
                    <Lock size={12} />
                    {t('insights.adminView', 'Admin View')}
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-[600px] text-slate-100">
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
                        <ViewHeader title={t('analyst.title', 'Smart Data Analyst')} icon={FileSpreadsheet} />
                        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
                             <SpreadsheetAnalysisPanel />
                        </div>
                    </motion.div>
                )}

                {/* --- MODE: GRAPH (NEXUS) --- */}
                {viewMode === 'graph' && isAdmin && ( // PHOENIX: Also protected here
                    <motion.div 
                        key="graph" 
                        initial={{ opacity: 0, scale: 0.98 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.98 }} 
                        transition={{ duration: 0.3 }}
                    >
                        <ViewHeader title={t('graph.title', 'Nexus Topology')} icon={Network} />
                        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative h-[700px]">
                             <GraphVisualization />
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
                        {/* Section 1: Advanced Tools Selection */}
                        <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6`}>
                            
                            {/* Card 1: Analyst Button */}
                            <motion.button 
                                whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(59, 130, 246, 0.15)' }} 
                                whileTap={{ scale: 0.98 }} 
                                onClick={() => setViewMode('analyst')} 
                                className="relative overflow-hidden group rounded-2xl p-px bg-gradient-to-b from-blue-500/20 to-slate-800/20 text-left h-full"
                            >
                                <div className="absolute inset-0 bg-slate-900/95 rounded-2xl z-0" />
                                <div className="absolute inset-0 bg-grid-slate-800/[0.2] z-0" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.1 }} />
                                
                                <div className="relative z-10 p-6 flex flex-col h-full justify-between">
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 group-hover:border-blue-500/50 transition-colors">
                                            <FileSpreadsheet className="text-blue-400" size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                                                {t('analyst.title', 'Smart Analyst')}
                                            </h3>
                                            <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                                                {t('analyst.desc', 'Deep dive into excel data with AI-powered anomaly detection.')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex items-center text-xs font-mono text-blue-500 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                        {t('analyst.initialize')} <span className="ml-2">→</span>
                                    </div>
                                </div>
                            </motion.button>
                            
                            {/* PHOENIX: Card 2 is now conditionally rendered */}
                            {isAdmin && (
                                <motion.button 
                                    whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(16, 185, 129, 0.15)' }} 
                                    whileTap={{ scale: 0.98 }} 
                                    onClick={() => setViewMode('graph')} 
                                    className="relative overflow-hidden group rounded-2xl p-px bg-gradient-to-b from-emerald-500/20 to-slate-800/20 text-left h-full"
                                >
                                    <div className="absolute inset-0 bg-slate-900/95 rounded-2xl z-0" />
                                    <div className="absolute inset-0 bg-grid-slate-800/[0.2] z-0" style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.1 }} />

                                    <div className="relative z-10 p-6 flex flex-col h-full justify-between">
                                        <div className="space-y-3">
                                            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 group-hover:border-emerald-500/50 transition-colors">
                                                <Network className="text-emerald-400" size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                                                    {t('graph.title', 'Nexus Topology')}
                                                </h3>
                                                <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                                                    {t('graph.desc', 'Visualize hidden connections between clients and capital flow.')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-6 flex items-center text-xs font-mono text-emerald-500 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                            {t('graph.launch')} <span className="ml-2">→</span>
                                        </div>
                                    </div>
                                </motion.button>
                            )}
                        </div>
                        
                        {/* Section 2: Real-time Metrics (Modules) */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                <Cpu size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">{t('insights.liveMetrics')}</span>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <DebtModule data={debtAnalytics} />
                                <TaxModule data={taxAnalytics} />
                                <ProfitModule data={profitAnalytics} />
                            </div>
                        </div>

                        {/* Footer Tip */}
                        <div className="flex items-center justify-center p-4 border-t border-slate-800/50">
                            <span className="text-slate-500 text-xs flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                {t('insights.systemActive')} • V4.0.1
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};