// FILE: frontend/src/components/SpreadsheetAnalysisPanel.tsx
// PHOENIX PROTOCOL - REVISION V11.0 (DESIGN SYSTEM ALIGNMENT)
// 1. FEATURE: Translated "Smart Data Analyst" to Albanian using i18next.
// 2. UPDATED: Uses new design system CSS variables for light/dark theme compatibility.
// 3. STATUS: Fully localized and theme-compatible.

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
    UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, TrendingUp, 
    DollarSign, Activity, X, BarChart3, Camera, FileUp, Smartphone,
    ShieldAlert, Sparkles 
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

    useEffect(() => {
        if (isQrModalOpen && handoffToken) {
            pollingIntervalRef.current = setInterval(async () => {
                try {
                    const { status: handoffStatus, filename } = await apiService.getHandoffStatus(handoffToken);
                    
                    if (handoffStatus === 'complete' && filename) {
                        const fileData = await apiService.retrieveHandoffFile(handoffToken, filename);
                        handleUpload(fileData);
                        setIsQrModalOpen(false);
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

    const closeQrModal = () => {
        setIsQrModalOpen(false);
        setHandoffToken(null);
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }
    };

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

    // 1. UPLOAD STATE
    if (status === 'idle') {
        return (
            <>
            <div className="min-h-[500px] flex flex-col items-center justify-center p-4 text-center">
                <div 
                    className="hidden sm:flex min-h-[450px] w-full flex-col items-center justify-center border-2 border-dashed border-border-main rounded-3xl bg-surface hover:bg-hover transition-colors cursor-pointer group"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                >
                    <div className="p-6 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-all mb-6">
                        <UploadCloud className="w-16 h-16 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-primary mb-2">{t('analyst.dropTitle', 'Ngarko ose Hidh Skedarin')}</h2>
                    <p className="text-text-secondary mb-6 max-w-md mx-auto">{t('analyst.dropDesc', 'Tërhiqni një skedar Excel, CSV, ose imazh.')}</p>
                    <div className="flex items-center gap-4">
                        <button onClick={() => fileInputRef.current?.click()} className="btn-primary px-8 py-3">{t('analyst.selectButton', 'Zgjidh Skedarin')}</button>
                        <button onClick={startHandoff} className="btn-secondary flex items-center justify-center gap-2"><Smartphone size={18} /> {t('analyst.scanFromPhone', 'Skano nga Telefoni')}</button>
                    </div>
                </div>
                {/* Mobile View */}
                <div className="sm:hidden w-full flex flex-col items-center justify-center">
                    <h2 className="text-2xl font-bold text-text-primary mb-4">{t('analyst.mobileTitle', 'Analizo një Dokument')}</h2>
                    <p className="text-text-secondary mb-8 max-w-md mx-auto">{t('analyst.mobileDesc', 'Skanoni një dokument me kamerë ose ngarkoni një skedar nga telefoni juaj.')}</p>
                    <div className="w-full space-y-4">
                        <button onClick={() => scanInputRef.current?.click()} className="btn-primary w-full flex items-center justify-center gap-2"><Camera size={18} />{t('analyst.scanButton', 'Skano me Kamerë')}</button>
                        <div className="text-text-muted text-sm font-bold uppercase">{t('general.or', 'ose')}</div>
                        <button onClick={() => fileInputRef.current?.click()} className="btn-secondary w-full flex items-center justify-center gap-2"><FileUp size={18} />{t('analyst.uploadButton', 'Ngarko Skedar')}</button>
                    </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".csv, .xlsx, .xls, .png, .jpg, .jpeg"/>
                <input type="file" ref={scanInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" capture="environment"/>
            </div>
            
            {isQrModalOpen && handoffToken && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-glass backdrop-blur-xl border border-border-main p-8 rounded-2xl w-full max-w-sm shadow-xl text-center relative">
                        <button onClick={closeQrModal} className="absolute top-3 right-3 p-2 text-text-muted hover:text-text-primary hover:bg-hover rounded-full"><X size={18} /></button>
                        <h3 className="text-xl font-bold text-text-primary mb-2">{t('analyst.qrModalTitle', 'Skano për të Ngarkuar')}</h3>
                        <p className="text-text-secondary mb-6">{t('analyst.qrModalDesc', 'Përdorni kamerën e celularit tuaj për të hapur linkun e sigurt të ngarkimit.')}</p>
                        <div className="bg-card p-4 rounded-lg inline-block border border-border-main">
                            <QRCode value={`${window.location.origin}/mobile-upload/${handoffToken}`} size={200} />
                        </div>
                        <div className="mt-6 flex items-center justify-center gap-2 text-text-muted animate-pulse">
                           <Loader2 className="w-4 h-4 animate-spin"/> {t('analyst.qrModalWaiting', 'Duke pritur për skedarin...')}
                        </div>
                    </motion.div>
                </div>
            )}
            </>
        );
    }
    
    // 2. PROCESSING STATE
    if (status === 'uploading' || status === 'analyzing') {
        const isImage = file?.type.startsWith('image/');
        const statusMessage = isImage ? t('analyst.statusScanning', 'Duke skanuar dhe strukturuar të dhënat...') : t('analyst.statusAnalyzing', 'Duke kërkuar për anomali financiare...');
        return (
            <div className="min-h-[500px] flex flex-col items-center justify-center bg-surface rounded-3xl p-4 text-center border border-border-main">
                <div className="relative mb-8"><div className="absolute inset-0 bg-primary blur-xl opacity-20 animate-pulse"></div><Loader2 className="w-16 h-16 sm:w-20 sm:h-20 text-primary animate-spin relative z-10" /></div>
                <h3 className="text-lg sm:text-xl font-bold text-text-primary mb-2">{statusMessage}</h3>
                <p className="text-text-secondary text-sm animate-pulse break-all px-4">{file?.name}</p>
            </div>
        );
    }

    // 3. ERROR STATE
    if (status === 'error') {
        return (
            <div className="min-h-[500px] flex flex-col items-center justify-center bg-danger/5 border border-danger/20 rounded-3xl text-center p-8">
                <AlertTriangle className="w-16 h-16 text-danger mb-4" />
                <h3 className="text-xl font-bold text-text-primary mb-2">{t('analyst.analysisErrorTitle', 'Gabim në Analizë')}</h3>
                <p className="text-danger mb-6 max-w-lg">{errorMsg}</p>
                <button onClick={reset} className="btn-secondary">{t('analyst.tryAgainButton', 'Provo Përsëri')}</button>
            </div>
        );
    }

    // 4. DASHBOARD (SUCCESS)
    if (status === 'complete' && result) {
        const maxVal = Math.max(...result.chart_data.map(d => d.value), 1);
        return (
            <div className="bg-card p-4 sm:p-6 md:p-8 min-h-[600px] h-full text-text-primary border border-border-main rounded-2xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><FileSpreadsheet className="text-primary" />{t('analyst.reportTitle', 'Raporti i Analizës')}</h2>
                        <p className="text-text-muted text-xs sm:text-sm mt-1 break-all">{file?.name} • {new Date().toLocaleDateString()}</p>
                    </div>
                    <button onClick={reset} className="self-end sm:self-auto p-2 hover:bg-hover rounded-lg text-text-muted hover:text-text-primary transition-colors"><X size={20} /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-surface p-4 rounded-2xl border border-border-main">
                        <div className="flex items-center gap-3 mb-2 text-text-muted text-xs sm:text-sm font-medium uppercase tracking-wider"><DollarSign size={16} /> {t('analyst.totalVolume', 'Total Volum')}</div>
                        <div className={clsx("text-xl sm:text-2xl font-bold", { 'text-success-start': result.stats.total_sum >= 0, 'text-danger': result.stats.total_sum < 0 })}>
                            €{result.stats.total_sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl border border-border-main">
                        <div className="flex items-center gap-3 mb-2 text-text-muted text-xs sm:text-sm font-medium uppercase tracking-wider"><Activity size={16} /> {t('analyst.transactions', 'Transaksione')}</div>
                        <div className="text-xl sm:text-2xl font-bold text-text-primary">{result.stats.transaction_count}</div>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl border border-border-main">
                        <div className="flex items-center gap-3 mb-2 text-text-muted text-xs sm:text-sm font-medium uppercase tracking-wider"><TrendingUp size={16} /> {t('analyst.average', 'Mesatarja')}</div>
                        <div className={clsx("text-xl sm:text-2xl font-bold", { 'text-primary': result.stats.average >= 0, 'text-warning-start': result.stats.average < 0 })}>
                            €{result.stats.average.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-primary/20 to-primary/10 p-4 sm:p-6 rounded-2xl border border-primary/20">
                        <h3 className="text-base sm:text-lg font-bold text-primary mb-3 flex items-center gap-2"><CheckCircle2 size={18} /> {t('analyst.executiveSummaryTitle', 'Përmbledhja Ekzekutive')}</h3>
                        <p className="text-sm sm:text-base text-text-secondary leading-relaxed whitespace-pre-line">{result.ai_summary.summary}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-danger/10 p-4 sm:p-5 rounded-2xl border border-danger/20">
                            <h3 className="text-base font-bold text-danger mb-3 flex items-center gap-2"><ShieldAlert size={18} /> {t('analyst.primaryRiskTitle', 'Rreziku Primar')}</h3>
                            <p className="text-sm text-text-secondary leading-relaxed">{result.ai_summary.primary_risk}</p>
                        </div>
                        <div className="bg-success-start/10 p-4 sm:p-5 rounded-2xl border border-success-start/20">
                             <h3 className="text-base font-bold text-success-start mb-3 flex items-center gap-2"><Sparkles size={18} /> {t('analyst.keyRecommendationTitle', 'Rekomandimi Kryesor')}</h3>
                             <p className="text-sm text-text-secondary leading-relaxed">{result.ai_summary.key_recommendation}</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    <div className="bg-surface p-4 sm:p-6 rounded-2xl border border-border-main flex flex-col h-full min-h-[350px]">
                        <h3 className="font-bold text-text-primary mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-success-start"/> {t('analyst.expenseTrendTitle', 'Trendi i Shpenzimeve')}</h3>
                        <div className="flex-1 w-full overflow-x-auto pb-4">
                            <div className="flex items-end gap-2 h-48 sm:h-64 min-w-[300px]">
                                {result.chart_data.length === 0 ? ( <div className="w-full h-full flex items-center justify-center text-text-muted text-sm">{t('analyst.noChartData', 'Nuk ka të dhëna grafike')}</div> ) : (
                                    result.chart_data.map((item, idx) => (
                                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group relative min-w-[30px]">
                                            <div className="hidden sm:block absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-card text-text-primary text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none border border-border-main shadow-sm">€{item.value.toLocaleString()}</div>
                                            <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max((item.value / maxVal) * 100, 2)}%` }} transition={{ duration: 0.5, delay: idx * 0.05 }} className="w-full bg-success-start/80 hover:bg-success-start transition-all rounded-t-sm relative"><div className="absolute top-0 w-full h-[2px] bg-success-start/50"></div></motion.div>
                                            <span className="text-xs text-text-muted truncate w-full text-center group-hover:text-text-primary transition-colors pt-2">{item.label}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="bg-surface p-4 sm:p-6 rounded-2xl border border-border-main flex flex-col h-full min-h-[300px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-text-primary">{t('analyst.anomaliesTitle', 'Anomali & Të Dyshimta')}</h3>
                            <span className="px-2 py-1 bg-danger/20 text-danger text-xs rounded-full font-bold">{result.anomalies.length} {t('analyst.findingsCount', 'Gjetje')}</span>
                        </div>
                        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[400px]">
                            {result.anomalies.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-text-muted italic"><CheckCircle2 size={32} className="mb-2 opacity-50 text-success-start" /><p>{t('analyst.noAnomalies', 'Asnjë anomali e zbuluar.')}</p></div>
                            ) : (
                                result.anomalies.map((ano, i) => (
                                    <div key={i} className="flex gap-3 p-4 bg-danger/5 border border-danger/10 rounded-xl hover:bg-danger/10 transition-colors">
                                        <AlertTriangle className={`flex-shrink-0 w-5 h-5 mt-0.5 ${ ano.severity === 'high' ? 'text-danger' : ano.severity === 'medium' ? 'text-warning-start' : 'text-warning-start' }`} />
                                        <div><p className="text-sm text-text-primary font-bold mb-1">{ano.type}</p><p className="text-xs text-text-muted leading-relaxed">{ano.description}</p></div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default SpreadsheetAnalysisPanel;