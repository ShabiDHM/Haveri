// FILE: src/components/DraftingPanel.tsx
// PHOENIX PROTOCOL - DRAFTING PANEL V2.3 (CRITICAL STABILITY FIX)
// 1. CRITICAL FIX: Temporarily disabled the streaming (typing) animation, which is the likely source of the render crash. The full text will now appear at once.
// 2. STABILITY: Added more robust "crash-proof" safety checks to the custom placeholder renderer to handle any unexpected AI output format.
// 3. UX: The UI remains consistent with the professional styling and stable footer.

import React, { useState, useRef, useEffect } from 'react';
import { apiService } from '../services/api';
import { useTranslation } from 'react-i18next';
import { 
  Send, Copy, Download, CheckCircle, 
  FileText, Trash2, LayoutTemplate, Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- TYPES ---
type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'SUCCESS' | 'FAILED' | 'FAILURE';
type TemplateType = 'generic' | 'kontrate' | 'email' | 'marketing_post';

interface DraftingJobState {
  jobId: string | null;
  status: JobStatus | null;
  result: string | null;
  error: string | null;
}

interface DraftingPanelProps {
    activeCaseId: string;
    className?: string;
}

// --- PHOENIX: Crash-Proof Renderer ---
const PlaceholderRenderer = ({ node, ...props }: any) => {
    // SAFETY CHECK: Ensure the node has valid children before proceeding.
    if (!node || !node.children || node.children.length === 0 || !node.children[0] || typeof node.children[0].value !== 'string') {
        // Render an empty paragraph to prevent crashing on malformed nodes.
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
                ) : (
                    part
                )
            )}
        </p>
    );
};

const DraftingPanel: React.FC<DraftingPanelProps> = ({ activeCaseId, className }) => {
  const { t } = useTranslation();
  const [context, setContext] = useState('');
  const [currentJob, setCurrentJob] = useState<DraftingJobState>({ jobId: null, status: null, result: null, error: null });
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('kontrate');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pollingIntervalRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
    }
  };

  useEffect(() => { return () => stopPolling(); }, []);

  const startPolling = (jobId: string) => {
    stopPolling();
    pollingIntervalRef.current = window.setInterval(async () => {
      try {
        const statusResponse = await apiService.getDraftingJobStatus(jobId);
        const newStatus = statusResponse.status as JobStatus; 
        setCurrentJob(prev => ({ ...prev, status: newStatus }));

        if (newStatus === 'COMPLETED' || newStatus === 'SUCCESS') {
          stopPolling();
          const resultResponse = await apiService.getDraftingJobResult(jobId);
          const finalResult = resultResponse.document_text || resultResponse.result_text || "";
          setCurrentJob(prev => ({ ...prev, status: 'COMPLETED', result: finalResult, error: null }));
          setIsSubmitting(false);
        } else if (newStatus === 'FAILED' || newStatus === 'FAILURE') {
          stopPolling();
          setCurrentJob(prev => ({ ...prev, status: 'FAILED', error: statusResponse.error || t('drafting.errorJobFailed'), result: null }));
          setIsSubmitting(false);
        }
      } catch (error) { 
          console.error("Polling failed:", error);
          stopPolling();
          setCurrentJob(prev => ({ ...prev, status: 'FAILED', error: t('drafting.errorJobFailed') }));
          setIsSubmitting(false);
      }
    }, 2000);
  };

  const runDraftingJob = async () => {
    if (!context.trim()) return;
    setIsSubmitting(true);
    setCurrentJob({ jobId: null, status: 'PENDING', result: null, error: null });
    try {
      const jobResponse = await apiService.initiateDraftingJob({ 
          user_prompt: context.trim(), 
          context: context.trim(), 
          case_id: activeCaseId, 
          use_library: true,
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
  const handleClearResult = () => { if (window.confirm(t('drafting.confirmClear'))) { stopPolling(); setCurrentJob({ jobId: null, status: null, result: null, error: null }); setIsSubmitting(false); } };

  return (
    <div className={`flex flex-col relative overflow-hidden h-full w-full ${className}`}>
        <style>{` select option, select optgroup { background-color: #0f172a; color: #f9fafb; } `}</style>
        
        {/* HEADER AREA */}
        <div className="flex flex-col gap-4 p-3 sm:p-4 border-b border-white/10 bg-white/5 z-20">
            <div className='relative group min-w-0'>
                <LayoutTemplate className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-400 transition-colors pointer-events-none"/>
                <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value as TemplateType)} disabled={isSubmitting || !!currentJob.result} className="w-full bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:border-blue-500/50 outline-none text-xs pl-10 pr-4 py-3 appearance-none transition-colors cursor-pointer font-medium disabled:opacity-70">
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
            {!currentJob.result && (
                <form onSubmit={handleSubmit} className="flex gap-2 items-stretch">
                    <textarea 
                        value={context} 
                        onChange={(e) => setContext(e.target.value)} 
                        placeholder={t('drafting.promptPlaceholder')} 
                        disabled={isSubmitting} 
                        rows={3}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:border-blue-500/50 outline-none text-sm resize-none custom-scrollbar transition-all duration-300 disabled:opacity-70" 
                    />
                    <button type="submit" disabled={isSubmitting || !context.trim()} className="px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center aspect-square sm:aspect-auto">
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                    </button>
                </form>
            )}
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar z-0 relative min-h-0 bg-black/20">
            {currentJob.result ? (
                // PHOENIX: Streaming component removed for stability. Direct render is safer.
                <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-p:leading-relaxed">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{ p: PlaceholderRenderer }}
                    >
                        {currentJob.result}
                    </ReactMarkdown>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
                    <FileText size={48} className="mb-4 text-gray-500" />
                    <p className="text-sm text-gray-400 max-w-xs">{ isSubmitting ? t('drafting.loadingState', 'Duke gjeneruar dokumentin...') : t('drafting.emptyState', 'Rezultati do të shfaqet këtu.')}</p>
                    {currentJob.error && <p className="text-red-400 text-xs mt-2">{currentJob.error}</p>}
                </div>
            )}
        </div>

        {/* FOOTER AREA */}
        <div className="p-3 border-t border-white/10 bg-white/5 flex justify-between items-center z-20">
            <div className="flex items-center gap-2 text-xs font-bold">
                {currentJob.status === 'COMPLETED' ? (
                    <span className="text-emerald-400 flex items-center gap-2"><CheckCircle size={14} /> {t('drafting.statusCompleted', 'Përfunduar')}</span>
                ) : isSubmitting ? (
                    <span className="text-blue-400 flex items-center gap-2 animate-pulse"><Loader2 size={14} className="animate-spin" /> {t('drafting.statusGenerating', 'Duke Gjeneruar...')}</span>
                ) : (
                    <span className="text-gray-400">{t('drafting.statusReady', 'Gati')}</span>
                )}
            </div>
            <div className="flex gap-1 sm:gap-2">
                <button onClick={handleCopyResult} disabled={!currentJob.result} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={t('drafting.copyTitle')}><Copy size={16}/></button>
                <button onClick={handleDownloadResult} disabled={!currentJob.result} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={t('drafting.downloadTitle')}><Download size={16}/></button>
                <button onClick={handleClearResult} disabled={!currentJob.result} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={t('drafting.clearTitle')}><Trash2 size={16}/></button>
            </div>
        </div>
    </div>
  );
};

export default DraftingPanel;