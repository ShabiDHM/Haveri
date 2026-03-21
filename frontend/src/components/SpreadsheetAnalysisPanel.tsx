// FILE: src/components/SpreadsheetAnalysisPanel.tsx
// PHOENIX PROTOCOL - ANALYST PANEL V16.0 (FIXED QR INTEGRATION)

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
    UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, TrendingUp, 
    DollarSign, Activity, X, BarChart3, Camera, FileUp, Smartphone,
    ShieldAlert, Sparkles, FileText
} from 'lucide-react';
import { apiService } from '../services/api';
import { AnalysisResult } from '../data/types';
import { AxiosError } from 'axios';
import clsx from 'clsx';
import QRCode from 'qrcode.react';

// --- COMPONENT ---
const SpreadsheetAnalysisPanel: React.FC = () => {
    const { t } = useTranslation();
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'>('idle');
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scanInputRef = useRef<HTMLInputElement>(null);
    
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [handoffToken, setHandoffToken] = useState<string | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // --- HANDOFF LOGIC ---
    const startHandoff = async () => {
        try {
            const { token } = await apiService.createHandoffSession();
            setHandoffToken(token);
            setIsQrModalOpen(true);
        } catch (error) {
            alert("Dështoi krijimi i sesionit për celular.");
        }
    };

    const closeQrModal = () => {
        setIsQrModalOpen(false);
        setHandoffToken(null);
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }
    };

    useEffect(() => {
        if (isQrModalOpen && handoffToken) {
            pollingIntervalRef.current = setInterval(async () => {
                try {
                    const { status: handoffStatus, filename } = await apiService.getHandoffStatus(handoffToken);
                    
                    if (handoffStatus === 'complete' && filename) {
                        const fileData = await apiService.retrieveHandoffFile(handoffToken, filename);
                        handleUpload(fileData);
                        closeQrModal();
                    }
                } catch (error) {
                     console.error("Polling error:", error);
                }
            }, 3000);
        }
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [isQrModalOpen, handoffToken]);

    // --- HANDLERS ---
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

    // --- RENDERERS ---

    // 1. IDLE STATE
    if (status === 'idle') {
        return (
            <>
            <div className="bg-card border border-border-main rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
                {/* Header */}
                <div className="px-5 pt-5 pb-3 border-b border-border-main bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="text-primary" size={18} />
                        </div>
                        <h3 className="text-lg font-bold text-text-primary">
                            {t('analyst.smartDataAnalystTitle', 'Analisti i të Dhënave')}
                        </h3>
                    </div>
                    <p className="text-xs text-text-muted mt-2">
                        {t('analyst.description', 'Merrni analiza të thelluara të të dhënave Excel me zbulim anomalish të fuqizuar nga AI.')}
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 p-5 flex flex-col items-center justify-center min-h-[400px]">
                    {/* Desktop Upload Zone */}
                    <div 
                        className="hidden sm:flex w-full max-w-md flex-col items-center justify-center border-2 border-dashed border-border-main rounded-2xl bg-surface/20 hover:bg-surface/40 transition-all cursor-pointer group py-10"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                    >
                        <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-all mb-3">
                            <UploadCloud className="w-10 h-10 text-primary" />
                        </div>
                        <h4 className="text-base font-semibold text-text-primary mb-1">{t('analyst.dropTitle', 'Ngarko Skedarin')}</h4>
                        <p className="text-text-muted text-xs mb-4 text-center px-4">{t('analyst.dropDesc', 'Tërhiqni një skedar Excel, CSV, ose imazh.')}</p>
                        <div className="flex items-center gap-3">
                            <button onClick={() => fileInputRef.current?.click()} className="btn-primary px-4 py-2 text-xs">{t('analyst.selectButton', 'Zgjidh Skedarin')}</button>
                            <button onClick={startHandoff} className="btn-secondary flex items-center justify-center gap-2 text-xs"><Smartphone size={14} /> {t('analyst.scanFromPhone', 'Skano nga Telefoni')}</button>
                        </div>
                    </div>
                    
                    {/* Mobile View */}
                    <div className="sm:hidden w-full flex flex-col items-center justify-center">
                        <div className="p-2 rounded-full bg-primary/10 mb-2">
                            <FileSpreadsheet className="w-8 h-8 text-primary" />
                        </div>
                        <h4 className="text-sm font-semibold text-text-primary mb-1 text-center">{t('analyst.mobileTitle', 'Analizo një Dokument')}</h4>
                        <p className="text-text-muted text-xs mb-4 text-center">{t('analyst.mobileDesc', 'Skanoni një dokument me kamerë ose ngarkoni një skedar nga telefoni juaj.')}</p>
                        <div className="w-full space-y-2">
                            <button onClick={() => scanInputRef.current?.click()} className="btn-primary w-full flex items-center justify-center gap-2 py-2 text-xs"><Camera size={14} />{t('analyst.scanButton', 'Skano me Kamerë')}</button>
                            <div className="text-text-muted text-[10px] font-medium uppercase text-center">{t('general.or', 'ose')}</div>
                            <button onClick={() => fileInputRef.current?.click()} className="btn-secondary w-full flex items-center justify-center gap-2 py-2 text-xs"><FileUp size={14} />{t('analyst.uploadButton', 'Ngarko Skedar')}</button>
                        </div>
                    </div>
                    
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".csv, .xlsx, .xls, .png, .jpg, .jpeg"/>
                    <input type="file" ref={scanInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" capture="environment"/>
                </div>
            </div>
            
            {/* QR Modal */}
            {isQrModalOpen && handoffToken && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-glass backdrop-blur-xl border border-border-main p-5 rounded-2xl w-full max-w-sm shadow-xl text-center relative">
                        <button onClick={closeQrModal} className="absolute top-2 right-2 p-1.5 text-text-muted hover:text-text-primary hover:bg-hover rounded-full"><X size={16} /></button>
                        <h3 className="text-base font-bold text-text-primary mb-1">{t('analyst.qrModalTitle', 'Skano për të Ngarkuar')}</h3>
                        <p className="text-text-muted text-xs mb-4">{t('analyst.qrModalDesc', 'Përdorni kamerën e celularit tuaj për të hapur linkun e sigurt të ngarkimit.')}</p>
                        <div className="bg-card p-3 rounded-xl inline-block border border-border-main">
                            <QRCode value={`${window.location.origin}/mobile-upload/${handoffToken}`} size={160} />
                        </div>
                        <div className="mt-4 flex items-center justify-center gap-2 text-text-muted text-xs">
                           <Loader2 className="w-3 h-3 animate-spin"/> {t('analyst.qrModalWaiting', 'Duke pritur për skedarin...')}
                        </div>
                    </motion.div>
                </div>
            )}
            </>
        );
    }
    
    // 2. PROCESSING STATE
    if (status === 'uploading' || status === 'analyzing') {
        return (
            <div className="bg-card border border-border-main rounded-2xl shadow-sm h-full flex flex-col">
                <div className="px-5 pt-5 pb-3 border-b border-border-main bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <FileSpreadsheet className="text-primary" size={18} />
                        </div>
                        <h3 className="text-lg font-bold text-text-primary">{t('analyst.smartDataAnalystTitle', 'Analisti i të Dhënave')}</h3>
                    </div>
                </div>
                <div className="flex-1 p-5 flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                    <p className="text-text-primary text-sm font-medium mb-1">{t('analyst.statusAnalyzing', 'Duke analizuar...')}</p>
                    <p className="text-text-muted text-xs">{file?.name}</p>
                </div>
            </div>
        );
    }

    // 3. ERROR STATE
    if (status === 'error') {
        return (
            <div className="bg-card border border-danger/20 rounded-2xl shadow-sm h-full flex flex-col">
                <div className="px-5 pt-5 pb-3 border-b border-border-main bg-gradient-to-r from-danger/5 to-transparent">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-danger/10 rounded-lg">
                            <AlertTriangle className="text-danger" size={18} />
                        </div>
                        <h3 className="text-lg font-bold text-text-primary">{t('analyst.smartDataAnalystTitle', 'Analisti i të Dhënave')}</h3>
                    </div>
                </div>
                <div className="flex-1 p-5 flex flex-col items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-danger mb-4" />
                    <p className="text-text-primary text-sm font-medium mb-1">{t('analyst.analysisErrorTitle', 'Gabim në Analizë')}</p>
                    <p className="text-danger text-xs mb-4 text-center">{errorMsg}</p>
                    <button onClick={reset} className="btn-secondary text-xs">{t('analyst.tryAgainButton', 'Provo Përsëri')}</button>
                </div>
            </div>
        );
    }

    // 4. DASHBOARD (SUCCESS)
    if (status === 'complete' && result) {
        const maxVal = Math.max(...result.chart_data.map(d => d.value), 1);
        return (
            <div className="bg-card border border-border-main rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
                {/* Header */}
                <div className="px-5 pt-5 pb-3 border-b border-border-main bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <FileSpreadsheet className="text-primary" size={18} />
                            </div>
                            <h3 className="text-lg font-bold text-text-primary">
                                {t('analyst.reportTitle', 'Raporti i Analizës')}
                            </h3>
                        </div>
                        <button onClick={reset} className="p-1.5 hover:bg-hover rounded-lg text-text-muted hover:text-text-primary transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                    <p className="text-xs text-text-muted mt-1 break-all">{file?.name} • {new Date().toLocaleDateString()}</p>
                </div>
                
                {/* Content */}
                <div className="flex-1 p-5 space-y-5 overflow-y-auto">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-surface p-4 rounded-xl border border-border-main">
                            <div className="flex items-center gap-2 mb-2 text-text-muted text-xs font-semibold uppercase tracking-wider">
                                <DollarSign size={14} /> {t('analyst.totalVolume', 'Total Volum')}
                            </div>
                            <div className={clsx("text-2xl font-bold", { 'text-success-start': result.stats.total_sum >= 0, 'text-danger': result.stats.total_sum < 0 })}>
                                €{result.stats.total_sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="bg-surface p-4 rounded-xl border border-border-main">
                            <div className="flex items-center gap-2 mb-2 text-text-muted text-xs font-semibold uppercase tracking-wider">
                                <Activity size={14} /> {t('analyst.transactions', 'Transaksione')}
                            </div>
                            <div className="text-2xl font-bold text-text-primary">{result.stats.transaction_count}</div>
                        </div>
                        <div className="bg-surface p-4 rounded-xl border border-border-main">
                            <div className="flex items-center gap-2 mb-2 text-text-muted text-xs font-semibold uppercase tracking-wider">
                                <TrendingUp size={14} /> {t('analyst.average', 'Mesatarja')}
                            </div>
                            <div className={clsx("text-2xl font-bold", { 'text-primary': result.stats.average >= 0, 'text-warning-start': result.stats.average < 0 })}>
                                €{result.stats.average.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                    
                    {/* AI Summary */}
                    <div className="space-y-4">
                        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-xl border border-primary/20">
                            <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                                <CheckCircle2 size={16} /> {t('analyst.executiveSummaryTitle', 'Përmbledhja Ekzekutive')}
                            </h3>
                            <p className="text-sm text-text-secondary leading-relaxed">{result.ai_summary.summary}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-danger/5 p-4 rounded-xl border border-danger/20">
                                <h3 className="text-sm font-bold text-danger mb-2 flex items-center gap-2">
                                    <ShieldAlert size={16} /> {t('analyst.primaryRiskTitle', 'Rreziku Primar')}
                                </h3>
                                <p className="text-sm text-text-secondary leading-relaxed">{result.ai_summary.primary_risk}</p>
                            </div>
                            <div className="bg-success-start/5 p-4 rounded-xl border border-success-start/20">
                                <h3 className="text-sm font-bold text-success-start mb-2 flex items-center gap-2">
                                    <Sparkles size={16} /> {t('analyst.keyRecommendationTitle', 'Rekomandimi Kryesor')}
                                </h3>
                                <p className="text-sm text-text-secondary leading-relaxed">{result.ai_summary.key_recommendation}</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="bg-surface/30 p-4 rounded-xl border border-border-main">
                            <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2 text-sm">
                                <BarChart3 size={16} className="text-success-start"/> {t('analyst.expenseTrendTitle', 'Trendi i Shpenzimeve')}
                            </h3>
                            <div className="h-40 w-full">
                                <div className="flex items-end gap-2 h-full min-w-[200px]">
                                    {result.chart_data.length === 0 ? ( 
                                        <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">{t('analyst.noChartData', 'Nuk ka të dhëna grafike')}</div> 
                                    ) : (
                                        result.chart_data.map((item, idx) => (
                                            <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-1 group relative">
                                                <div className="hidden sm:block absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card text-text-primary text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 border border-border-main shadow-sm">
                                                    €{item.value.toLocaleString()}
                                                </div>
                                                <motion.div 
                                                    initial={{ height: 0 }} 
                                                    animate={{ height: `${Math.max((item.value / maxVal) * 100, 4)}%` }} 
                                                    transition={{ duration: 0.5, delay: idx * 0.05 }} 
                                                    className="w-full bg-success-start/70 hover:bg-success-start transition-all rounded-t-sm"
                                                />
                                                <span className="text-[10px] text-text-muted truncate w-full text-center group-hover:text-text-primary transition-colors pt-1">
                                                    {item.label}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-surface/30 p-4 rounded-xl border border-border-main">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold text-text-primary text-sm">{t('analyst.anomaliesTitle', 'Anomali & Të Dyshimta')}</h3>
                                <span className="px-2 py-0.5 bg-danger/20 text-danger text-xs rounded-full font-semibold">
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
                                        <div key={i} className="flex gap-2 p-2 bg-danger/5 border border-danger/10 rounded-lg hover:bg-danger/10 transition-colors">
                                            <AlertTriangle className={`flex-shrink-0 w-3 h-3 mt-0.5 ${ ano.severity === 'high' ? 'text-danger' : 'text-warning-start' }`} />
                                            <div>
                                                <p className="text-xs font-medium text-text-primary">{ano.type}</p>
                                                <p className="text-[11px] text-text-muted leading-relaxed">{ano.description}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default SpreadsheetAnalysisPanel;