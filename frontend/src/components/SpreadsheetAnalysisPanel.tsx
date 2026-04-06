// FILE: src/components/SpreadsheetAnalysisPanel.tsx
// PHOENIX PROTOCOL - ANALYST PANEL V27.0 (SMART INSIGHTS FOR NON-ANALYSTS)

import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
    UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, TrendingUp, 
    DollarSign, Activity, X, BarChart3, FileUp,
    Sparkles, FileText, Gauge, TrendingDown, PieChart, Zap
} from 'lucide-react';
import { apiService } from '../services/api';
import { AnalysisResult, Anomaly } from '../data/types';
import { AxiosError } from 'axios';
import clsx from 'clsx';
import { Panel } from './ui/Panel';

// --- Helper functions for computed insights ---

/** Compute growth rate from chart_data (assuming sequential labels, e.g., months) */
const computeGrowthRate = (chartData: { label: string; value: number }[]): number | null => {
    if (chartData.length < 2) return null;
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    if (first === 0) return null;
    return ((last - first) / first) * 100;
};

/** Compute outlier detection: values beyond 2 standard deviations from mean */
const detectOutliers = (chartData: { label: string; value: number }[]): { label: string; value: number; deviation: number }[] => {
    if (chartData.length < 3) return [];
    const values = chartData.map(d => d.value);
    const mean = values.reduce((a,b) => a+b,0) / values.length;
    const variance = values.reduce((a,b) => a + Math.pow(b-mean,2),0) / values.length;
    const stdDev = Math.sqrt(variance);
    const threshold = 2 * stdDev;
    return chartData
        .filter(d => Math.abs(d.value - mean) > threshold)
        .map(d => ({ label: d.label, value: d.value, deviation: (d.value - mean) / stdDev }));
};

/** Get top and bottom categories by value */
const getCategoryBreakdown = (chartData: { label: string; value: number }[]): { top: typeof chartData; bottom: typeof chartData } => {
    const sorted = [...chartData].sort((a,b) => b.value - a.value);
    return {
        top: sorted.slice(0, 3),
        bottom: sorted.slice(-3).reverse()
    };
};

/** Compute risk score (0-100) based on anomalies and negative trends */
const computeRiskScore = (anomalies: Anomaly[], growthRate: number | null, totalSum: number): number => {
    let risk = 0;
    // Anomaly contribution
    anomalies.forEach(ano => {
        if (ano.severity === 'high') risk += 30;
        else if (ano.severity === 'medium') risk += 15;
        else risk += 5;
    });
    // Negative growth contribution
    if (growthRate !== null && growthRate < -10) risk += 25;
    else if (growthRate !== null && growthRate < 0) risk += 10;
    // Negative total sum
    if (totalSum < 0) risk += 20;
    return Math.min(risk, 100);
};

/** Generate actionable recommendations from analysis */
const generateRecommendations = (
    stats: AnalysisResult['stats'],
    anomalies: Anomaly[],
    growthRate: number | null,
    categoryBreakdown: { top: any[]; bottom: any[] },
    aiKeyRecommendation: string
): string[] => {
    const recs: string[] = [];
    // Add AI recommendation first
    if (aiKeyRecommendation && aiKeyRecommendation.trim() !== '') {
        recs.push(aiKeyRecommendation);
    }
    // Growth based
    if (growthRate !== null) {
        if (growthRate > 15) recs.push(`📈 Rritje e shkëlqyer prej ${growthRate.toFixed(1)}%. Vazhdoni tendencën duke rritur marketingun ose stokun.`);
        else if (growthRate < -10) recs.push(`📉 Rënie prej ${growthRate.toFixed(1)}%. Shqyrtoni shpenzimet dhe kërkoni mundësi për ulje kostosh.`);
        else if (growthRate < 0) recs.push(`⚠️ Rënie e lehtë (${growthRate.toFixed(1)}%). Optimizoni faturimin ose ofroni zbritje për klientët besnikë.`);
        else recs.push(`✅ Rritje pozitive prej ${growthRate.toFixed(1)}%. Mbani këtë ritëm.`);
    }
    // Anomalies based
    if (anomalies.length > 0) {
        const highRisk = anomalies.filter(a => a.severity === 'high');
        if (highRisk.length > 0) {
            recs.push(`🚨 ${highRisk.length} anomali me rrezik të lartë. Kontrolloni menjëherë: ${highRisk.map(a => a.type).join(', ')}.`);
        } else {
            recs.push(`🔍 ${anomalies.length} anomali të zbuluara. Rishikoni detajet për të shmangur humbje.`);
        }
    }
    // Category insights
    if (categoryBreakdown.top.length > 0) {
        const topCat = categoryBreakdown.top[0];
        recs.push(`🏆 Kategoria më e madhe: ${topCat.label} me €${topCat.value.toLocaleString()}. Fokusohuni këtu për rritje.`);
    }
    if (categoryBreakdown.bottom.length > 0 && categoryBreakdown.bottom[0].value < stats.average * 0.5) {
        const bottomCat = categoryBreakdown.bottom[0];
        recs.push(`📉 Kategoria më e dobët: ${bottomCat.label} (€${bottomCat.value.toLocaleString()}). Shqyrtoni nëse mund të reduktohet.`);
    }
    // General advice
    if (stats.total_sum < 0) {
        recs.push(`💸 Humbje totale prej €${Math.abs(stats.total_sum).toLocaleString()}. Rekomandohet rishikim i menjëhershëm i kostove.`);
    } else if (stats.total_sum === 0) {
        recs.push(`📊 Asnjë fitim/humbje. Provoni të rrisni vëllimin e transaksioneve.`);
    }
    // Remove duplicates and limit to 5
    return [...new Set(recs)].slice(0, 5);
};

// --- COMPONENT ---
const SpreadsheetAnalysisPanel: React.FC = () => {
    const { t } = useTranslation();
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'>('idle');
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scanInputRef = useRef<HTMLInputElement>(null);

    // Computed insights (only when result exists)
    const computedInsights = useMemo(() => {
        if (!result) return null;
        const growth = computeGrowthRate(result.chart_data);
        const outliers = detectOutliers(result.chart_data);
        const categoryBreak = getCategoryBreakdown(result.chart_data);
        const riskScore = computeRiskScore(result.anomalies, growth, result.stats.total_sum);
        const recommendations = generateRecommendations(
            result.stats, 
            result.anomalies, 
            growth, 
            categoryBreak,
            result.ai_summary.key_recommendation
        );
        return { growth, outliers, categoryBreak, riskScore, recommendations };
    }, [result]);

    // --- HANDLERS (unchanged) ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleUpload(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.name.match(/\.(csv|xlsx|xls|jpg|jpeg|png)$/i)) {
                 handleUpload(droppedFile);
            } else {
                alert(t('analyst.errorFileType', 'Ky lloj i skedarit nuk mbështetet.'));
            }
        }
    };

    const handleUpload = async (selectedFile: File) => {
        setFile(selectedFile);
        setStatus('uploading');
        setErrorMsg('');
        
        try {
            setTimeout(() => setStatus('analyzing'), 800);
            const data = await apiService.analyzeDocument(selectedFile);
            setResult(data);
            setStatus('complete');
        } catch (err: any) {
            console.error("Analysis Error:", err);
            setStatus('error');
            let message = "Failed to analyze file.";
            if (err instanceof AxiosError && err.response?.data?.detail) {
                message = err.response.data.detail;
            } else if (err.message) {
                message = err.message;
            }
            setErrorMsg(message);
        }
    };

    const reset = () => {
        setFile(null);
        setResult(null);
        setStatus('idle');
    };

    // --- RENDERERS (idle, processing, error remain same, only dashboard enhanced) ---

    // 1. IDLE STATE (unchanged except minor styling)
    if (status === 'idle') {
        return (
            <Panel className="p-0 overflow-hidden relative shadow-sm border border-border-main bg-surface/30 backdrop-blur-sm">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-start to-primary-start/60 z-10" />
                <div className="px-5 pt-5 pb-3 border-b border-border-main bg-gradient-to-r from-primary-start/5 to-transparent">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary-start/10 rounded-lg border border-primary-start/20">
                            <FileText className="text-primary-start" size={18} />
                        </div>
                        <h3 className="text-lg font-bold text-text-primary">
                            {t('analyst.smartDataAnalystTitle', 'Analisti i të Dhënave')}
                        </h3>
                    </div>
                    <p className="text-xs text-text-muted mt-2 leading-relaxed">
                        {t('analyst.description', 'Merrni analiza të thelluara të të dhënave Excel me zbulim anomalish të fuqizuar nga AI.')}
                    </p>
                </div>
                <div className="p-6 flex flex-col items-center justify-center">
                    <div className="hidden sm:flex w-full max-w-md flex-col items-center justify-center border-2 border-dashed border-border-main rounded-xl bg-surface/30 hover:bg-surface/50 transition-all cursor-pointer group py-8 hover-lift"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                    >
                        <div className="p-3 rounded-full bg-primary-start/10 group-hover:bg-primary-start/20 transition-all mb-3">
                            <UploadCloud className="w-10 h-10 text-primary-start" />
                        </div>
                        <h4 className="text-base font-semibold text-text-primary mb-1">
                            {t('analyst.dropTitle', 'Ngarko Skedarin')}
                        </h4>
                        <p className="text-text-muted text-xs mb-4 text-center px-4">
                            {t('analyst.dropDesc', 'Tërhiqni një skedar Excel, CSV, ose imazh.')}
                        </p>
                        <button onClick={() => fileInputRef.current?.click()} className="btn-primary px-5 py-2 text-sm rounded-xl shadow-sm hover-lift">
                            {t('analyst.selectButton', 'Zgjidh Skedarin')}
                        </button>
                    </div>
                    <div className="sm:hidden w-full flex flex-col items-center justify-center">
                        <div className="p-2 rounded-full bg-primary-start/10 mb-2">
                            <FileSpreadsheet className="w-8 h-8 text-primary-start" />
                        </div>
                        <h4 className="text-sm font-semibold text-text-primary mb-1 text-center">
                            {t('analyst.mobileTitle', 'Ngarko Skedarin')}
                        </h4>
                        <p className="text-text-muted text-xs mb-4 text-center">
                            {t('analyst.mobileDesc', 'Ngarkoni një skedar nga telefoni juaj.')}
                        </p>
                        <div className="w-full space-y-2">
                            <button onClick={() => fileInputRef.current?.click()} className="btn-primary w-full flex items-center justify-center gap-2 py-2 text-xs rounded-xl shadow-sm hover-lift">
                                <FileUp size={14} /> {t('analyst.uploadButton', 'Ngarko Skedarin')}
                            </button>
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".csv, .xlsx, .xls, .png, .jpg, .jpeg"/>
                    <input type="file" ref={scanInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" capture="environment"/>
                </div>
            </Panel>
        );
    }
    
    // 2. PROCESSING STATE (unchanged)
    if (status === 'uploading' || status === 'analyzing') {
        return (
            <Panel className="p-0 overflow-hidden relative shadow-sm border border-border-main bg-surface/30 backdrop-blur-sm">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-start to-primary-start/60 z-10" />
                <div className="px-5 pt-5 pb-3 border-b border-border-main bg-gradient-to-r from-primary-start/5 to-transparent">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary-start/10 rounded-lg border border-primary-start/20">
                            <FileSpreadsheet className="text-primary-start" size={18} />
                        </div>
                        <h3 className="text-lg font-bold text-text-primary">
                            {t('analyst.smartDataAnalystTitle', 'Analisti i të Dhënave')}
                        </h3>
                    </div>
                </div>
                <div className="p-8 flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 text-primary-start animate-spin mb-4" />
                    <p className="text-text-primary text-sm font-medium mb-1">
                        {t('analyst.statusAnalyzing', 'Duke analizuar...')}
                    </p>
                    <p className="text-text-muted text-xs">{file?.name}</p>
                </div>
            </Panel>
        );
    }

    // 3. ERROR STATE (unchanged)
    if (status === 'error') {
        return (
            <Panel className="p-0 overflow-hidden relative shadow-sm border border-border-main bg-surface/30 backdrop-blur-sm">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-danger-start to-danger-start/60 z-10" />
                <div className="px-5 pt-5 pb-3 border-b border-border-main bg-gradient-to-r from-danger-start/5 to-transparent">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-danger-start/10 rounded-lg border border-danger-start/20">
                            <AlertTriangle className="text-danger-start" size={18} />
                        </div>
                        <h3 className="text-lg font-bold text-text-primary">
                            {t('analyst.smartDataAnalystTitle', 'Analisti i të Dhënave')}
                        </h3>
                    </div>
                </div>
                <div className="p-8 flex flex-col items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-danger-start mb-4" />
                    <p className="text-text-primary text-sm font-medium mb-1">
                        {t('analyst.analysisErrorTitle', 'Gabim në Analizë')}
                    </p>
                    <p className="text-danger-start text-xs mb-4 text-center">{errorMsg}</p>
                    <button onClick={reset} className="glass-input !bg-surface hover:bg-hover transition-colors text-xs px-5 py-2 rounded-xl border border-border-main hover:border-primary-start/50 hover-lift shadow-sm">
                        {t('analyst.tryAgainButton', 'Provo Përsëri')}
                    </button>
                </div>
            </Panel>
        );
    }

    // 4. DASHBOARD (ENHANCED WITH SMART INSIGHTS)
    if (status === 'complete' && result && computedInsights) {
        const maxVal = Math.max(...result.chart_data.map(d => d.value), 1);
        const { growth, outliers, categoryBreak, riskScore, recommendations } = computedInsights;
        
        // Risk score color and label
        const riskColor = riskScore >= 70 ? 'text-danger-start' : riskScore >= 40 ? 'text-warning-start' : 'text-success-start';
        const riskBg = riskScore >= 70 ? 'bg-danger-start/10' : riskScore >= 40 ? 'bg-warning-start/10' : 'bg-success-start/10';
        const riskBorder = riskScore >= 70 ? 'border-danger-start/30' : riskScore >= 40 ? 'border-warning-start/30' : 'border-success-start/30';
        
        return (
            <Panel className="p-0 overflow-hidden relative shadow-sm border border-border-main bg-surface/30 backdrop-blur-sm">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-success-start to-success-start/60 z-10" />
                
                {/* Header */}
                <div className="px-5 pt-5 pb-3 border-b border-border-main bg-gradient-to-r from-primary-start/5 to-transparent">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary-start/10 rounded-lg border border-primary-start/20">
                                <FileSpreadsheet className="text-primary-start" size={18} />
                            </div>
                            <h3 className="text-lg font-bold text-text-primary">
                                {t('analyst.reportTitle', 'Raporti i Analizës')}
                            </h3>
                        </div>
                        <button onClick={reset} className="p-1.5 hover:bg-hover rounded-lg text-text-muted hover:text-text-primary transition-colors hover-lift">
                            <X size={16} />
                        </button>
                    </div>
                    <p className="text-xs text-text-muted mt-1 break-all">
                        {file?.name} • {new Date().toLocaleDateString()}
                    </p>
                </div>
                
                <div className="p-5 space-y-5">
                    {/* Enhanced Stats Cards with Growth and Risk */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-surface/30 backdrop-blur-sm p-4 rounded-xl border border-border-main shadow-sm">
                            <div className="flex items-center gap-2 mb-2 text-text-muted text-xs font-black uppercase tracking-widest">
                                <DollarSign size={14} /> {t('analyst.totalVolume', 'Total Volum')}
                            </div>
                            <div className={clsx("text-2xl font-bold", { 'text-success-start': result.stats.total_sum >= 0, 'text-danger-start': result.stats.total_sum < 0 })}>
                                €{result.stats.total_sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="bg-surface/30 backdrop-blur-sm p-4 rounded-xl border border-border-main shadow-sm">
                            <div className="flex items-center gap-2 mb-2 text-text-muted text-xs font-black uppercase tracking-widest">
                                <Activity size={14} /> {t('analyst.transactions', 'Transaksione')}
                            </div>
                            <div className="text-2xl font-bold text-text-primary">{result.stats.transaction_count}</div>
                        </div>
                        <div className="bg-surface/30 backdrop-blur-sm p-4 rounded-xl border border-border-main shadow-sm">
                            <div className="flex items-center gap-2 mb-2 text-text-muted text-xs font-black uppercase tracking-widest">
                                <TrendingUp size={14} /> {t('analyst.average', 'Mesatarja')}
                            </div>
                            <div className={clsx("text-2xl font-bold", { 'text-primary-start': result.stats.average >= 0, 'text-warning-start': result.stats.average < 0 })}>
                                €{result.stats.average.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        {/* NEW: Growth Rate KPI */}
                        <div className="bg-surface/30 backdrop-blur-sm p-4 rounded-xl border border-border-main shadow-sm">
                            <div className="flex items-center gap-2 mb-2 text-text-muted text-xs font-black uppercase tracking-widest">
                                {growth !== null && growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {t('analyst.growthRate', 'Norma e Rritjes')}
                            </div>
                            <div className={clsx("text-2xl font-bold", {
                                'text-success-start': growth !== null && growth > 0,
                                'text-danger-start': growth !== null && growth < 0,
                                'text-text-muted': growth === null
                            })}>
                                {growth !== null ? `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%` : 'N/A'}
                            </div>
                        </div>
                    </div>
                    
                    {/* Risk Score Card - NEW */}
                    <div className={`${riskBg} backdrop-blur-sm p-4 rounded-xl border ${riskBorder} shadow-sm`}>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <Gauge size={20} className={riskColor} />
                                <h3 className="font-bold text-text-primary">Reziku i Përgjithshëm</h3>
                            </div>
                            <div className={`text-2xl font-bold ${riskColor}`}>{riskScore} / 100</div>
                        </div>
                        <p className="text-xs text-text-muted mt-2">
                            {riskScore >= 70 ? '⚠️ Rrezik i lartë – veprim i menjëhershëm i rekomanduar' : 
                             riskScore >= 40 ? '⚡ Rrezik mesatar – monitoroni treguesit kryesorë' : 
                             '✅ Rrezik i ulët – vazhdoni praktikat ekzistuese'}
                        </p>
                    </div>
                    
                    {/* AI Summary + Smart Insights combined */}
                    <div className="space-y-4">
                        <div className="bg-gradient-to-r from-primary-start/10 to-primary-start/5 p-4 rounded-xl border border-primary-start/20">
                            <h3 className="text-sm font-bold text-primary-start mb-2 flex items-center gap-2">
                                <Sparkles size={16} /> Përmbledhja e AI
                            </h3>
                            <p className="text-sm text-text-secondary leading-relaxed">{result.ai_summary.summary}</p>
                            <div className="mt-3 pt-3 border-t border-primary-start/20">
                                <h4 className="text-xs font-semibold text-text-muted mb-1">Rreziku Primar (AI)</h4>
                                <p className="text-sm text-text-secondary">{result.ai_summary.primary_risk}</p>
                            </div>
                        </div>
                        
                        {/* Actionable Recommendations - NEW */}
                        <div className="bg-warning-start/5 p-4 rounded-xl border border-warning-start/20">
                            <h3 className="text-sm font-bold text-warning-start mb-2 flex items-center gap-2">
                                <Zap size={16} /> Rekomandime të Veprueshme
                            </h3>
                            <ul className="space-y-2">
                                {recommendations.map((rec, idx) => (
                                    <li key={idx} className="text-sm text-text-secondary leading-relaxed flex gap-2">
                                        <span className="text-warning-start">•</span> {rec}
                                    </li>
                                ))}
                                {recommendations.length === 0 && (
                                    <li className="text-sm text-text-muted">Asnjë rekomandim shtesë për momentin.</li>
                                )}
                            </ul>
                        </div>
                        
                        {/* Category Breakdown - NEW */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-surface/30 p-4 rounded-xl border border-border-main">
                                <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
                                    <PieChart size={14} className="text-success-start" /> Kategoritë Kryesore
                                </h3>
                                {categoryBreak.top.length > 0 ? (
                                    <div className="space-y-2">
                                        {categoryBreak.top.map(cat => (
                                            <div key={cat.label} className="flex justify-between items-center text-sm">
                                                <span className="text-text-secondary truncate">{cat.label}</span>
                                                <span className="font-semibold text-text-primary">€{cat.value.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-xs text-text-muted">Nuk ka të dhëna kategorish.</p>}
                            </div>
                            <div className="bg-surface/30 p-4 rounded-xl border border-border-main">
                                <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
                                    <TrendingDown size={14} className="text-danger-start" /> Kategoritë Më të Dobëta
                                </h3>
                                {categoryBreak.bottom.length > 0 ? (
                                    <div className="space-y-2">
                                        {categoryBreak.bottom.map(cat => (
                                            <div key={cat.label} className="flex justify-between items-center text-sm">
                                                <span className="text-text-secondary truncate">{cat.label}</span>
                                                <span className="font-semibold text-text-primary">€{cat.value.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-xs text-text-muted">Nuk ka të dhëna kategorish.</p>}
                            </div>
                        </div>
                    </div>
                    
                    {/* Charts and Anomalies (enhanced with outlier detection) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="bg-surface/30 backdrop-blur-sm p-4 rounded-xl border border-border-main shadow-sm">
                            <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2 text-sm">
                                <BarChart3 size={16} className="text-success-start"/> {t('analyst.expenseTrendTitle', 'Trendi i Shpenzimeve')}
                                {outliers.length > 0 && <span className="text-xs bg-warning-start/20 text-warning-start px-2 py-0.5 rounded-full">{outliers.length} outlier</span>}
                            </h3>
                            <div className="h-40 w-full">
                                <div className="flex items-end gap-2 h-full min-w-[200px]">
                                    {result.chart_data.length === 0 ? ( 
                                        <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
                                            {t('analyst.noChartData', 'Nuk ka të dhëna grafike')}
                                        </div> 
                                    ) : (
                                        result.chart_data.map((item, idx) => {
                                            const isOutlier = outliers.some(o => o.label === item.label);
                                            return (
                                                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-1 group relative">
                                                    <div className="hidden sm:block absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card text-text-primary text-xs px-2 py-1 rounded whitespace-nowrap z-10 border border-border-main shadow-sm">
                                                        €{item.value.toLocaleString()}
                                                    </div>
                                                    <motion.div 
                                                        initial={{ height: 0 }} 
                                                        animate={{ height: `${Math.max((item.value / maxVal) * 100, 4)}%` }} 
                                                        transition={{ duration: 0.5, delay: idx * 0.05 }} 
                                                        className={clsx("w-full transition-all rounded-t-sm", {
                                                            'bg-danger-start/70 hover:bg-danger-start': isOutlier,
                                                            'bg-success-start/70 hover:bg-success-start': !isOutlier
                                                        })}
                                                    />
                                                    <span className="text-xs text-text-muted truncate w-full text-center group-hover:text-text-primary transition-colors pt-1">
                                                        {item.label}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-surface/30 backdrop-blur-sm p-4 rounded-xl border border-border-main shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold text-text-primary text-sm">
                                    {t('analyst.anomaliesTitle', 'Anomali & Të Dyshimta')}
                                </h3>
                                <span className="px-2 py-0.5 bg-danger-start/20 text-danger-start text-xs rounded-full font-semibold">
                                    {result.anomalies.length} {t('analyst.findingsCount', 'Gjetje')}
                                </span>
                            </div>
                            <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                                {result.anomalies.length === 0 ? (
                                    <div className="h-24 flex flex-col items-center justify-center text-text-muted">
                                        <CheckCircle2 size={24} className="mb-1 opacity-50 text-success-start" />
                                        <p className="text-xs">{t('analyst.noAnomalies', 'Asnjë anomali e zbuluar.')}</p>
                                    </div>
                                ) : (
                                    result.anomalies.map((ano, i) => (
                                        <div key={i} className="flex gap-2 p-2 bg-danger-start/5 border border-danger-start/10 rounded-lg hover:bg-danger-start/10 transition-colors">
                                            <AlertTriangle className={`flex-shrink-0 w-3 h-3 mt-0.5 ${ ano.severity === 'high' ? 'text-danger-start' : 'text-warning-start' }`} />
                                            <div>
                                                <p className="text-xs font-medium text-text-primary">{ano.type}</p>
                                                <p className="text-xs text-text-muted leading-relaxed">{ano.description}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Panel>
        );
    }
    return null;
};

export default SpreadsheetAnalysisPanel;