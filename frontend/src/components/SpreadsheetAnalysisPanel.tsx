// FILE: frontend/src/components/SpreadsheetAnalysisPanel.tsx
// PHOENIX PROTOCOL - REVISION V5 (READABILITY UPDATE)
// 1. UI FIX: Increased chart label font size (10px -> 12px/14px) and contrast.
// 2. STYLE: Improved tooltip visibility and bar interactions.

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
    UploadCloud, 
    FileSpreadsheet, 
    Loader2, 
    CheckCircle2, 
    AlertTriangle, 
    TrendingUp, 
    DollarSign, 
    Activity,
    FileText,
    X,
    BarChart3
} from 'lucide-react';
import { API_V1_URL } from '../services/api';

// --- TYPES ---
interface Anomaly {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    row_id: number;
}

interface ChartItem {
    label: string;
    value: number;
}

interface AnalysisResult {
    summary: string;
    stats: {
        total_sum: number;
        transaction_count: number;
        average: number;
    };
    chart_data: ChartItem[];
    anomalies: Anomaly[];
}

// --- COMPONENT ---
const SpreadsheetAnalysisPanel: React.FC = () => {
    const { t } = useTranslation();
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'>('idle');
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- HANDLERS ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            handleUpload(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            handleUpload(e.dataTransfer.files[0]);
        }
    };

    const handleUpload = async (selectedFile: File) => {
        setStatus('uploading');
        setErrorMsg('');
        
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            setTimeout(() => setStatus('analyzing'), 800);

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_V1_URL}/analysis/analyze-spreadsheet`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Analysis failed');
            }

            const data = await response.json();
            setResult(data);
            setStatus('complete');

        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setErrorMsg(err.message || "Failed to analyze file.");
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
            <div 
                className="min-h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group p-4 text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="p-6 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-all mb-6">
                    <UploadCloud className="w-12 h-12 sm:w-16 sm:h-16 text-blue-400" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{t('analyst.dropTitle', 'Ngarko Skedarin Financiar')}</h3>
                <p className="text-gray-400 mb-8 max-w-md mx-auto text-sm sm:text-base">
                    {t('analyst.dropDesc', 'Tërhiqni një skedar Excel (.xlsx) ose CSV. AI do të analizojë transaksionet automatikisht.')}
                </p>
                <button className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 w-full sm:w-auto">
                    {t('analyst.selectButton', 'Zgjidh Skedarin')}
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    accept=".csv, .xlsx, .xls"
                />
            </div>
        );
    }

    // 2. PROCESSING STATE
    if (status === 'uploading' || status === 'analyzing') {
        return (
            <div className="min-h-[500px] flex flex-col items-center justify-center bg-gray-900/50 rounded-3xl p-4 text-center">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse"></div>
                    <Loader2 className="w-16 h-16 sm:w-20 sm:h-20 text-blue-400 animate-spin relative z-10" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                    {status === 'uploading' ? 'Duke lexuar të dhënat...' : 'Duke kërkuar për anomali...'}
                </h3>
                <p className="text-gray-400 text-sm animate-pulse break-all px-4">
                    {file?.name}
                </p>
            </div>
        );
    }

    // 3. ERROR STATE
    if (status === 'error') {
        return (
            <div className="min-h-[500px] flex flex-col items-center justify-center bg-red-500/5 border border-red-500/20 rounded-3xl text-center p-8">
                <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Gabim në Analizë</h3>
                <p className="text-red-300 mb-6 max-w-lg">{errorMsg}</p>
                <button onClick={reset} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                    Provo Përsëri
                </button>
            </div>
        );
    }

    // 4. DASHBOARD (SUCCESS)
    if (status === 'complete' && result) {
        const maxVal = Math.max(...result.chart_data.map(d => d.value), 1);

        return (
            <div className="bg-gray-900 p-4 sm:p-6 md:p-8 min-h-[600px] h-full text-white">
                
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                            <FileSpreadsheet className="text-blue-400" />
                            Raporti i Analizës
                        </h2>
                        <p className="text-gray-400 text-xs sm:text-sm mt-1 break-all">
                            {file?.name} • {new Date().toLocaleDateString()}
                        </p>
                    </div>
                    <button onClick={reset} className="self-end sm:self-auto p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* KPI Cards (Responsive Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-3 mb-2 text-gray-400 text-xs sm:text-sm font-medium uppercase tracking-wider">
                            <DollarSign size={16} /> Total Volum
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-emerald-400">
                            €{result.stats.total_sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-3 mb-2 text-gray-400 text-xs sm:text-sm font-medium uppercase tracking-wider">
                            <Activity size={16} /> Transaksione
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white">
                            {result.stats.transaction_count}
                        </div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-3 mb-2 text-gray-400 text-xs sm:text-sm font-medium uppercase tracking-wider">
                            <TrendingUp size={16} /> Mesatarja
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-blue-400">
                            €{result.stats.average.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                {/* AI Narrative */}
                <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-4 sm:p-6 rounded-2xl border border-blue-500/20 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><FileText size={80} /></div>
                    <h3 className="text-base sm:text-lg font-bold text-blue-300 mb-3 flex items-center gap-2">
                        <CheckCircle2 size={18} /> Përmbledhja Ekzekutive
                    </h3>
                    <p className="text-sm sm:text-base text-gray-200 leading-relaxed whitespace-pre-line relative z-10">
                        {result.summary}
                    </p>
                </div>

                {/* Charts & Anomalies Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* CSS Bar Chart (Mobile Scrollable) */}
                    <div className="bg-white/5 p-4 sm:p-6 rounded-2xl border border-white/10 flex flex-col h-full min-h-[350px]">
                        <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2">
                            <BarChart3 size={18} className="text-emerald-400"/> 
                            Trendi i Shpenzimeve
                        </h3>
                        
                        {/* Chart Container */}
                        <div className="flex-1 w-full overflow-x-auto pb-4">
                            <div className="flex items-end gap-2 h-48 sm:h-64 min-w-[300px]">
                                {result.chart_data.length === 0 ? (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                                        Nuk ka të dhëna grafike
                                    </div>
                                ) : (
                                    result.chart_data.map((item, idx) => {
                                        const heightPct = (item.value / maxVal) * 100;
                                        return (
                                            <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group relative min-w-[30px]">
                                                {/* Tooltip */}
                                                <div className="hidden sm:block absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none border border-white/10">
                                                    €{item.value.toLocaleString()}
                                                </div>

                                                {/* Animated Bar */}
                                                <motion.div 
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${Math.max(heightPct, 2)}%` }}
                                                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                                                    className="w-full bg-emerald-500/80 hover:bg-emerald-400 transition-all rounded-t-sm relative"
                                                >
                                                    <div className="absolute top-0 w-full h-[2px] bg-emerald-200/50 shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
                                                </motion.div>

                                                {/* FIX: Font size increased for readability */}
                                                <span className="text-xs text-gray-400 truncate w-full text-center group-hover:text-white transition-colors pt-2">
                                                    {item.label}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Anomalies List */}
                    <div className="bg-white/5 p-4 sm:p-6 rounded-2xl border border-white/10 flex flex-col h-full min-h-[300px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-200">Anomali & Të Dyshimta</h3>
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-bold">
                                {result.anomalies.length} Gjetje
                            </span>
                        </div>
                        
                        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[400px]">
                            {result.anomalies.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500 italic">
                                    <CheckCircle2 size={32} className="mb-2 opacity-50 text-emerald-500" />
                                    <p>Asnjë anomali e zbuluar.</p>
                                </div>
                            ) : (
                                result.anomalies.map((ano, i) => (
                                    <div key={i} className="flex gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-xl hover:bg-red-500/10 transition-colors">
                                        <AlertTriangle className={`flex-shrink-0 w-5 h-5 mt-0.5 ${
                                            ano.severity === 'high' ? 'text-red-500' : 
                                            ano.severity === 'medium' ? 'text-orange-400' : 'text-yellow-400'
                                        }`} />
                                        <div>
                                            <p className="text-sm text-gray-200 font-bold mb-1">{ano.type}</p>
                                            <p className="text-xs text-gray-400 leading-relaxed">{ano.description}</p>
                                        </div>
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