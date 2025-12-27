// FILE: src/pages/DraftingPage.tsx
// PHOENIX PROTOCOL - DRAFTING PAGE V7.1 (LINT FIX)
// 1. FIX: Added 'Loader2' to Lucide imports.
// 2. CLEANUP: Removed unused 'RefreshCw' icon import.

import React, { useState, useRef, useEffect } from 'react';
import { apiService } from '../services/api';
import { useTranslation } from 'react-i18next';
import { Case } from '../data/types'; 
import { 
  PenTool, Send, Copy, Download, AlertCircle, CheckCircle, Clock, 
  FileText, Sparkles, RotateCcw, Trash2, Briefcase, ChevronDown, LayoutTemplate, Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'SUCCESS' | 'FAILED' | 'FAILURE';
type TemplateType = 'generic' | 'padi' | 'pergjigje' | 'kunderpadi' | 'kontrate';

interface DraftingJobState {
  jobId: string | null;
  status: JobStatus | null;
  result: string | null;
  error: string | null;
}

// --- AUTO RESIZE TEXTAREA ---
const AutoResizeTextarea: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder?: string; disabled?: boolean; className?: string; minHeight?: number; maxHeight?: number; }> = ({ 
    value, onChange, placeholder, disabled, className, minHeight = 150, maxHeight = 500 
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; 
            const scrollHeight = textareaRef.current.scrollHeight;
            const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
            textareaRef.current.style.height = `${newHeight}px`;
            textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
        }
    }, [value, minHeight, maxHeight]);
    return (
        <textarea ref={textareaRef} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} className={`${className} transition-all duration-200 ease-in-out`} style={{ minHeight: `${minHeight}px` }} />
    );
};

// --- STREAMING MARKDOWN ---
const StreamedMarkdown: React.FC<{ text: string, isNew: boolean, onComplete: () => void }> = ({ text, isNew, onComplete }) => {
    const [displayedText, setDisplayedText] = useState(isNew ? "" : text);
    useEffect(() => {
        if (!isNew) { setDisplayedText(text); return; }
        setDisplayedText(""); 
        let index = 0; const speed = 5; 
        const intervalId = setInterval(() => {
            setDisplayedText((prev) => {
                if (index >= text.length) { clearInterval(intervalId); onComplete(); return text; }
                const nextChar = text.charAt(index); index++; return prev + nextChar;
            });
        }, speed);
        return () => clearInterval(intervalId);
    }, [text, isNew, onComplete]);

    return (
        <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:font-black prose-headings:tracking-tight prose-a:text-blue-400 prose-strong:text-amber-300 prose-ul:marker:text-blue-500">
             <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedText}</ReactMarkdown>
        </div>
    );
};

const DraftingPage: React.FC = () => {
  const { t } = useTranslation();
  const [context, setContext] = useState(() => localStorage.getItem('drafting_context') || '');
  const [currentJob, setCurrentJob] = useState<DraftingJobState>(() => {
      const savedJob = localStorage.getItem('drafting_job');
      return savedJob ? JSON.parse(savedJob) : { jobId: null, status: null, result: null, error: null };
  });
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>(undefined);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('generic');
  const [isResultNew, setIsResultNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pollingIntervalRef = useRef<number | null>(null);

  useEffect(() => { localStorage.setItem('drafting_context', context); }, [context]);
  useEffect(() => { localStorage.setItem('drafting_job', JSON.stringify(currentJob)); }, [currentJob]);
  useEffect(() => { const fetchCases = async () => { try { const userCases = await apiService.getCases(); if (Array.isArray(userCases)) setCases(userCases); else setCases([]); } catch (error) { console.error("DraftingPage: Failed to fetch cases:", error); } }; fetchCases(); }, []);
  useEffect(() => { return () => { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); }; }, []);

  const getCaseDisplayName = (c: Case) => {
    if (c.title && c.title.trim().length > 0) return c.title;
    if (c.case_name && c.case_name.trim().length > 0) return c.case_name;
    if (c.case_number) return `Rasti: ${c.case_number}`;
    return `Rasti #${c.id.substring(0, 8)}...`;
  };

  const startPolling = (jobId: string) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = window.setInterval(async () => {
      try {
        const statusResponse = await apiService.getDraftingJobStatus(jobId);
        const newStatus = statusResponse.status as JobStatus; 
        setCurrentJob(prev => ({ ...prev, status: newStatus }));
        if (newStatus === 'COMPLETED' || newStatus === 'SUCCESS') {
          try {
            const resultResponse = await apiService.getDraftingJobResult(jobId);
            const finalResult = resultResponse.document_text || resultResponse.result_text || "";
            setIsResultNew(true); 
            setCurrentJob(prev => ({ ...prev, status: 'COMPLETED', result: finalResult, error: null }));
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setIsSubmitting(false);
          } catch (error) {
            setCurrentJob(prev => ({ ...prev, error: t('drafting.errorFetchResult'), status: 'FAILED' }));
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setIsSubmitting(false);
          }
        } else if (newStatus === 'FAILED' || newStatus === 'FAILURE') {
          setCurrentJob(prev => ({ ...prev, status: 'FAILED', error: statusResponse.error || t('drafting.errorJobFailed'), result: null }));
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          setIsSubmitting(false);
        }
      } catch (error) { console.warn("Polling error:", error); }
    }, 2000);
  };

  const runDraftingJob = async () => {
    if (!context.trim()) return;
    setIsSubmitting(true);
    setCurrentJob({ jobId: null, status: 'PENDING', result: null, error: null });
    setIsResultNew(false);
    try {
      const jobResponse = await apiService.initiateDraftingJob({ 
          user_prompt: context.trim(), 
          context: context.trim(), 
          case_id: selectedCaseId, 
          use_library: !!selectedCaseId,
          document_type: selectedTemplate
      });
      setCurrentJob({ jobId: jobResponse.job_id, status: 'PENDING', result: null, error: null });
      startPolling(jobResponse.job_id);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || t('drafting.errorStartJob');
      setCurrentJob(prev => ({ ...prev, error: errorMessage, status: 'FAILED' }));
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); runDraftingJob(); };
  const handleCopyResult = async () => { if (currentJob.result) { await navigator.clipboard.writeText(currentJob.result); alert(t('general.copied')); } };
  const handleDownloadResult = () => { if (currentJob.result) { const blob = new Blob([currentJob.result], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `draft-${new Date().getTime()}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); } };
  const handleClearResult = () => { if (window.confirm(t('drafting.confirmClear'))) { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); setCurrentJob({ jobId: null, status: null, result: null, error: null }); setIsResultNew(false); } };

  const getStatusDisplay = () => {
    switch(currentJob.status) {
      case 'COMPLETED': case 'SUCCESS': return { text: t('drafting.statusCompleted'), color: 'text-emerald-400', icon: <CheckCircle className="h-5 w-5 text-emerald-400" /> };
      case 'FAILED': case 'FAILURE': return { text: t('drafting.statusFailed'), color: 'text-rose-400', icon: <AlertCircle className="h-5 w-5 text-rose-400" /> };
      case 'PROCESSING': case 'PENDING': return { text: t('drafting.statusWorking'), color: 'text-amber-400', icon: <Clock className="h-5 w-5 animate-pulse text-amber-400" /> };
      default: return { text: t('drafting.statusResult'), color: 'text-white', icon: <Sparkles className="h-5 w-5 text-gray-500" /> };
    }
  };
  const statusDisplay = getStatusDisplay();

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-screen">
      <style>{` .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(59, 130, 246, 0.3); border-radius: 3px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(59, 130, 246, 0.5); } select option { background-color: #0f172a; color: #f9fafb; }`}</style>
      
      <div className="text-center mb-8 flex-shrink-0">
        <h1 className="text-4xl font-black text-white mb-2 flex items-center justify-center gap-4">
            <PenTool className="text-blue-500" />
            {t('drafting.title')}
        </h1>
        <p className="text-gray-400">{t('drafting.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
        
        <div className="flex flex-col h-full bg-gray-900/60 backdrop-blur-md rounded-3xl border border-white/10 p-6 shadow-2xl overflow-hidden">
            <h3 className="text-white font-bold text-xl mb-6 flex items-center gap-3 flex-shrink-0">
                <FileText className="text-blue-400" size={24} />
                {t('drafting.configuration')}
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-6 min-h-0">
                <div className="flex flex-col sm:flex-row gap-6 flex-shrink-0">
                    <div className='flex-1 min-w-0'>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">{t('drafting.caseLabel')}</label>
                        <div className="relative group">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors pointer-events-none"/>
                            <select value={selectedCaseId || ''} onChange={(e) => setSelectedCaseId(e.target.value || undefined)} disabled={isSubmitting} className="w-full bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:border-blue-500/50 outline-none text-sm pl-12 pr-10 py-4 appearance-none transition-colors cursor-pointer truncate">
                                <option value="" className="text-gray-400">{t('drafting.noCaseSelected')}</option>
                                {cases.length > 0 ? ( cases.map(c => (<option key={c.id} value={String(c.id)}>{getCaseDisplayName(c)}</option>)) ) : ( <option value="" disabled className="text-gray-500 italic">{t('drafting.noCasesFound')}</option> )}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"/>
                        </div>
                    </div>
                    <div className='flex-1 min-w-0'>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">{t('drafting.templateLabel')}</label>
                        <div className="relative group">
                            <LayoutTemplate className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors pointer-events-none"/>
                            <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value as TemplateType)} disabled={isSubmitting} className="w-full bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:border-blue-500/50 outline-none text-sm pl-12 pr-10 py-4 appearance-none transition-colors cursor-pointer">
                                <option value="generic">{t('drafting.templateGeneric')}</option>
                                <option value="padi">{t('drafting.templatePadi')}</option>
                                <option value="pergjigje">{t('drafting.templatePergjigje')}</option>
                                <option value="kunderpadi">{t('drafting.templateKunderpadi')}</option>
                                <option value="kontrate">{t('drafting.templateKontrate')}</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"/>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider flex-shrink-0">{t('drafting.instructionsLabel')}</label>
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar rounded-xl border border-white/10 bg-black/40 focus-within:border-blue-500/50 transition-colors">
                        <AutoResizeTextarea value={context} onChange={(e) => setContext(e.target.value)} placeholder={t('drafting.promptPlaceholder')} className="w-full p-4 bg-transparent text-white placeholder-gray-600 outline-none resize-none text-sm leading-relaxed" disabled={isSubmitting} minHeight={200} maxHeight={600} />
                    </div>
                </div>

                <button type="submit" disabled={isSubmitting || !context.trim()} className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex-shrink-0 hover:scale-[1.02] active:scale-95">
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  {t('drafting.generateBtn')}
                </button>
            </form>
        </div>

        <div className="flex flex-col h-full bg-gray-900/60 backdrop-blur-md rounded-3xl border border-white/10 p-6 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-6 flex-shrink-0">
                <h3 className="text-white font-bold text-lg flex items-center gap-3">{statusDisplay.icon}<span className={statusDisplay.color}>{statusDisplay.text}</span></h3>
                <div className="flex gap-2">
                    <button onClick={runDraftingJob} disabled={!currentJob.result || isSubmitting} className="p-2.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl text-gray-300 disabled:opacity-30 transition-colors border border-white/10" title={t('drafting.regenerate')}><RotateCcw size={18}/></button>
                    <button onClick={handleCopyResult} disabled={!currentJob.result} className="p-2.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl text-gray-300 disabled:opacity-30 transition-colors border border-white/10" title={t('drafting.copyTitle')}><Copy size={18}/></button>
                    <button onClick={handleDownloadResult} disabled={!currentJob.result} className="p-2.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl text-gray-300 disabled:opacity-30 transition-colors border border-white/10" title={t('drafting.downloadTitle')}><Download size={18}/></button>
                    <button onClick={handleClearResult} disabled={!currentJob.result && !currentJob.error} className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl disabled:opacity-30 transition-colors border border-rose-500/20" title={t('drafting.clearTitle')}><Trash2 size={18}/></button>
                </div>
            </div>
            {currentJob.error && (<div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 mb-4 text-sm text-rose-300 flex items-start gap-3 flex-shrink-0"><AlertCircle size={18} className="mt-0.5" />{currentJob.error}</div>)}
            <div className="flex-1 bg-black/40 rounded-2xl border border-white/10 p-6 overflow-y-auto custom-scrollbar relative min-h-0 shadow-inner">
                {currentJob.result ? (<StreamedMarkdown text={currentJob.result} isNew={isResultNew} onComplete={() => setIsResultNew(false)} />) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 opacity-50 p-4 text-center">
                        {isSubmitting || (currentJob.status === 'PENDING' || currentJob.status === 'PROCESSING') ? (
                            <>
                                <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-500" />
                                <p className="font-bold">{t('drafting.generatingMessage')}</p>
                            </>
                        ) : (
                            <>
                                <FileText className="w-16 h-16 mb-4" />
                                <p className="font-bold">{t('drafting.emptyState')}</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default DraftingPage;