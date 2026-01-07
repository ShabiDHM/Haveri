// FILE: src/components/DraftingPanel.tsx
// PHOENIX PROTOCOL - DRAFTING PANEL V3.2 (SYNTAX & TYPE CORRECTION)
// 1. FIX: Restored the standard React import to resolve the '{' expected syntax error.
// 2. CLEANUP: Removed all 'React.' prefixes from hooks (useState, useEffect, etc.).
// 3. TYPE SYNC: Retained the expanded 'JobStatus' type to ensure backend compatibility.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiService } from '../services/api';
import { useTranslation } from 'react-i18next';
import { 
  Send, Copy, Download, CheckCircle, 
  FileText, Trash2, LayoutTemplate, Loader2, AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Expanded type to include all possible backend states
type JobStatus = 'IDLE' | 'PENDING' | 'POLLING' | 'COMPLETED' | 'SUCCESS' | 'FAILED' | 'FAILURE';
type TemplateType = 'generic' | 'kontrate' | 'email' | 'marketing_post';

interface DraftingPanelProps {
    activeCaseId: string;
    className?: string;
}

const PlaceholderRenderer = ({ node, ...props }: any) => {
    if (!node || !node.children || node.children.length === 0 || !node.children[0] || typeof node.children[0].value !== 'string') {
        return <p {...props}></p>; 
    }
    const text = node.children[0].value;
    const parts = text.split(/(\[[^\]]+\])/g);
    return (
        <p {...props} style={{ whiteSpace: 'pre-wrap' }}>
            {parts.map((part: string, index: number) => 
                /(\[[^\]]+\])/.test(part) ? (
                    <span key={index} className="bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-md px-1.5 py-0.5 font-medium mx-1 text-xs sm:text-sm inline-block">
                        {part.slice(1, -1)}
                    </span>
                ) : ( part )
            )}
        </p>
    );
};

const DraftingPanel: React.FC<DraftingPanelProps> = ({ activeCaseId, className }) => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [prompt, setPrompt] = useState('');
  const [jobId, setJobId] = useState<string | null>(searchParams.get('jobId'));
  const [status, setStatus] = useState<JobStatus>('IDLE');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('kontrate');
  
  const pollingIntervalRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
    }
  };

  const startPolling = useCallback((currentJobId: string) => {
    stopPolling();
    setStatus('POLLING');
    pollingIntervalRef.current = window.setInterval(async () => {
      try {
        const statusResponse = await apiService.getDraftingJobStatus(currentJobId);
        const newStatus = statusResponse.status?.toUpperCase() as JobStatus;
        
        if (newStatus === 'COMPLETED' || newStatus === 'SUCCESS') {
          stopPolling();
          const resultResponse = await apiService.getDraftingJobResult(currentJobId);
          const finalResult = resultResponse.document_text || resultResponse.result_text || "";
          setResult(finalResult);
          setStatus('COMPLETED');
        } else if (newStatus === 'FAILED' || newStatus === 'FAILURE') {
          stopPolling();
          setError(statusResponse.error || t('drafting.errorJobFailed'));
          setStatus('FAILED');
        }
      } catch (err) { 
          stopPolling();
          setStatus('FAILED');
          setError(t('drafting.errorJobFailed'));
      }
    }, 3000);
  }, [t]);

  useEffect(() => {
    const initialJobId = searchParams.get('jobId');
    if (initialJobId) {
      const fetchInitialResult = async () => {
        setStatus('POLLING');
        try {
          const res = await apiService.getDraftingJobResult(initialJobId);
          const finalResult = res.document_text || res.result_text || "";
          if (finalResult && (res.status?.toUpperCase() === 'SUCCESS' || res.status?.toUpperCase() === 'COMPLETED')) {
            setResult(finalResult);
            setStatus('COMPLETED');
          } else {
            startPolling(initialJobId);
          }
        } catch (e) {
          setError(t('drafting.errorLoadJob'));
          setStatus('FAILED');
        }
      };
      fetchInitialResult();
    }
    return () => stopPolling();
  }, [searchParams, t, startPolling]);

  const runDraftingJob = async () => {
    if (!prompt.trim()) return;
    setStatus('PENDING');
    setResult(null);
    setError(null);
    try {
      const jobResponse = await apiService.initiateDraftingJob({ 
          user_prompt: prompt.trim(), 
          case_id: activeCaseId, 
          document_type: selectedTemplate
      });
      const newJobId = jobResponse.job_id;
      setJobId(newJobId);
      setSearchParams({ jobId: newJobId });
      startPolling(newJobId);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || t('drafting.errorStartJob');
      setError(errorMessage);
      setStatus('FAILED');
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); runDraftingJob(); };
  const handleCopyResult = async () => { if (result) { await navigator.clipboard.writeText(result); alert(t('general.copied')); } };
  const handleDownloadResult = () => { if (result) { const blob = new Blob([result], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `draft-${jobId}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); } };
  const handleClearResult = () => { 
      if (window.confirm(t('drafting.confirmClear'))) { 
          stopPolling(); 
          setJobId(null);
          setStatus('IDLE');
          setResult(null);
          setError(null);
          setPrompt('');
          setSearchParams({});
      } 
  };
  
  const isWorking = status === 'PENDING' || status === 'POLLING';

  return (
    <div className={`flex flex-col relative overflow-hidden h-full w-full ${className}`}>
        <style>{` select option, select optgroup { background-color: #0f172a; color: #f9fafb; } `}</style>
        
        <div className="flex flex-col gap-4 p-3 sm:p-4 border-b border-white/10 bg-white/5 z-20">
            <div className='relative group min-w-0'>
                <LayoutTemplate className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-400 transition-colors pointer-events-none"/>
                <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value as TemplateType)} disabled={isWorking || !!result} className="w-full bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:border-blue-500/50 outline-none text-xs pl-10 pr-4 py-3 appearance-none transition-colors cursor-pointer font-medium disabled:opacity-70">
                    <optgroup label={t('drafting.groupBusiness')}>
                        <option value="email">{t('drafting.templateEmail')}</option>
                        <option value="marketing_post">{t('drafting.templateMarketingPost')}</option>
                    </optgroup>
                    <optgroup label={t('drafting.groupLegal')}>
                        <option value="kontrate">{t('drafting.templateKontrate')}</option>
                        <option value="generic">{t('drafting.templateGeneric')}</option>
                    </optgroup>
                </select>
            </div>
            {!result && (
                <form onSubmit={handleSubmit} className="flex gap-2 items-stretch">
                    <textarea 
                        value={prompt} 
                        onChange={(e) => setPrompt(e.target.value)} 
                        placeholder={t('drafting.promptPlaceholder')} 
                        disabled={isWorking} 
                        rows={3}
                        className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600/50 focus:ring-1 focus:ring-blue-600/50 transition-all placeholder:text-gray-500 text-sm resize-none custom-scrollbar"
                    />
                    <button type="submit" disabled={isWorking || !prompt.trim()} className="px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center aspect-square">
                        {isWorking ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                    </button>
                </form>
            )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar z-0 relative min-h-0 bg-black/20">
            {result ? (
                <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-p:leading-relaxed">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{ p: PlaceholderRenderer }}
                    >
                        {result}
                    </ReactMarkdown>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
                    <FileText size={48} className="mb-4 text-gray-500" />
                    <p className="text-sm text-gray-400 max-w-xs">{ isWorking ? t('drafting.loadingState', 'Duke gjeneruar dokumentin...') : t('drafting.emptyState', 'Rezultati do të shfaqet këtu.')}</p>
                    {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                </div>
            )}
        </div>

        <div className="p-3 border-t border-white/10 bg-white/5 flex justify-between items-center z-20">
            <div className="flex items-center gap-2 text-xs font-bold">
                {status === 'COMPLETED' ? (
                    <span className="text-emerald-400 flex items-center gap-2"><CheckCircle size={14} /> {t('drafting.statusCompleted', 'Përfunduar')}</span>
                ) : isWorking ? (
                    <span className="text-blue-400 flex items-center gap-2 animate-pulse"><Loader2 size={14} className="animate-spin" /> {t('drafting.statusGenerating', 'Duke Gjeneruar...')}</span>
                ) : status === 'FAILED' ? (
                     <span className="text-red-400 flex items-center gap-2"><AlertCircle size={14} /> {t('drafting.statusFailed', 'Dështoi')}</span>
                ) : (
                    <span className="text-gray-400">{t('drafting.statusReady', 'Gati')}</span>
                )}
            </div>
            <div className="flex gap-1 sm:gap-2">
                <button onClick={handleCopyResult} disabled={!result} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={t('drafting.copyTitle')}><Copy size={16}/></button>
                <button onClick={handleDownloadResult} disabled={!result} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={t('drafting.downloadTitle')}><Download size={16}/></button>
                <button onClick={handleClearResult} disabled={!result} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={t('drafting.clearTitle')}><Trash2 size={16}/></button>
            </div>
        </div>
    </div>
  );
};

export default DraftingPanel;