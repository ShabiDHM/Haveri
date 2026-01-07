// FILE: src/components/DraftingPanel.tsx
// PHOENIX PROTOCOL - DRAFTING PANEL V2.0 (PROFESSIONAL STYLING)
// 1. FEATURE: Custom Markdown renderer highlights placeholders like [Emri] as fillable fields.
// 2. UI: Polished headers, footers, and buttons for a premium, symmetrical look.
// 3. MOBILE: Adjusted padding and text sizes for mobile responsiveness.

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

// --- PHOENIX: Custom Renderer for Placeholders ---
const PlaceholderRenderer = ({ node, ...props }: any) => {
    const text = node.children[0].value;
    // Regex to find placeholders like [Your Name]
    const parts = text.split(/(\[[^\]]+\])/g);

    return (
        <p {...props}>
            {parts.map((part: string, index: number) => 
                /(\[[^\]]+\])/.test(part) ? (
                    <span key={index} className="bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-md px-1.5 py-0.5 font-medium mx-1 text-xs sm:text-sm">
                        {part.slice(1, -1)}
                    </span>
                ) : (
                    part
                )
            )}
        </p>
    );
};


const StreamedMarkdown: React.FC<{ text: string, isNew: boolean, onComplete: () => void }> = ({ text, isNew, onComplete }) => {
    const [displayedText, setDisplayedText] = useState(isNew ? "" : text);
    
    useEffect(() => {
        if (!isNew) { setDisplayedText(text); return; }
        setDisplayedText(""); 
        let index = 0; const speed = 5; 
        const intervalId = setInterval(() => {
            if (index >= text.length) {
                clearInterval(intervalId);
                onComplete();
                return;
            }
            setDisplayedText(text.substring(0, index + 1));
            index++;
        }, speed);
        return () => clearInterval(intervalId);
    }, [text, isNew, onComplete]);

    return (
        <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-white prose-a:text-blue-400 prose-strong:text-amber-200">
             <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                    // Use our custom renderer for paragraphs
                    p: PlaceholderRenderer,
                }}
            >
                {displayedText}
            </ReactMarkdown>
        </div>
    );
};

const DraftingPanel: React.FC<DraftingPanelProps> = ({ activeCaseId, className }) => {
  const { t } = useTranslation();
  const [context, setContext] = useState('');
  const [currentJob, setCurrentJob] = useState<DraftingJobState>({ jobId: null, status: null, result: null, error: null });
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('generic');
  const [isResultNew, setIsResultNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pollingIntervalRef = useRef<number | null>(null);

  useEffect(() => { return () => { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); }; }, []);

  const startPolling = (jobId: string) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = window.setInterval(async () => {
      try {
        const statusResponse = await apiService.getDraftingJobStatus(jobId);
        const newStatus = statusResponse.status as JobStatus; 
        setCurrentJob(prev => ({ ...prev, status: newStatus }));
        if (newStatus === 'COMPLETED' || newStatus === 'SUCCESS') {
          const resultResponse = await apiService.getDraftingJobResult(jobId);
          const finalResult = resultResponse.document_text || resultResponse.result_text || "";
          setIsResultNew(true); 
          setCurrentJob(prev => ({ ...prev, status: 'COMPLETED', result: finalResult, error: null }));
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          setIsSubmitting(false);
        } else if (newStatus === 'FAILED' || newStatus === 'FAILURE') {
          setCurrentJob(prev => ({ ...prev, status: 'FAILED', error: statusResponse.error || t('drafting.errorJobFailed'), result: null }));
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          setIsSubmitting(false);
        }
      } catch (error) { 
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          setIsSubmitting(false);
      }
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
  const handleClearResult = () => { if (window.confirm(t('drafting.confirmClear'))) { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); setCurrentJob({ jobId: null, status: null, result: null, error: null }); setIsResultNew(false); } };

  return (
    // PHOENIX: Removed extra background colors to inherit from parent.
    <div className={`flex flex-col relative overflow-hidden h-full w-full ${className}`}>
        <style>{` select option, select optgroup { background-color: #0f172a; color: #f9fafb; } `}</style>
        
        {/* HEADER AREA */}
        <div className="flex flex-col gap-4 p-3 sm:p-4 border-b border-white/10 bg-white/5 z-20">
            {currentJob.result ? (
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
                        <FileText size={16} className="text-blue-400"/>
                        {t('drafting.documentReady', 'Dokument i Përgatitur')}
                    </div>
                 </div>
            ) : (
                <>
                    <div className='relative group min-w-0'>
                        <LayoutTemplate className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-400 transition-colors pointer-events-none"/>
                        <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value as TemplateType)} disabled={isSubmitting} className="w-full bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:border-blue-500/50 outline-none text-xs pl-10 pr-4 py-3 appearance-none transition-colors cursor-pointer font-medium">
                            <optgroup label={t('drafting.groupBusiness')}>
                                <option value="email">{t('drafting.templateEmail')}</option>
                                <option value="marketing_post">{t('drafting.templateMarketingPost')}</option>
                                <option value="generic">{t('drafting.templateGeneric')}</option>
                            </optgroup>
                            <optgroup label={t('drafting.groupLegal')}>
                                <option value="kontrate">{t('drafting.templateKontrate')}</option>
                            </optgroup>
                        </select>
                    </div>
                    <form onSubmit={handleSubmit} className="flex gap-2 items-stretch">
                        <textarea 
                            value={context} 
                            onChange={(e) => setContext(e.target.value)} 
                            placeholder={t('drafting.promptPlaceholder')} 
                            disabled={isSubmitting} 
                            rows={3}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:border-blue-500/50 outline-none text-sm resize-none custom-scrollbar transition-all duration-300" 
                        />
                        <button type="submit" disabled={isSubmitting || !context.trim()} className="px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center aspect-square sm:aspect-auto">
                            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                        </button>
                    </form>
                </>
            )}
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar z-0 relative min-h-0 bg-black/20">
            {currentJob.result ? (
                <StreamedMarkdown text={currentJob.result} isNew={isResultNew} onComplete={() => setIsResultNew(false)} />
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
                    <FileText size={48} className="mb-4 text-gray-500" />
                    <p className="text-sm text-gray-400 max-w-xs">{ isSubmitting ? t('drafting.loadingState') : t('drafting.emptyState')}</p>
                    {currentJob.error && <p className="text-red-400 text-xs mt-2">{currentJob.error}</p>}
                </div>
            )}
        </div>

        {/* FOOTER AREA */}
        {currentJob.result && (
            <div className="p-3 border-t border-white/10 bg-white/5 flex justify-between items-center z-20">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <CheckCircle size={14} /> {t('drafting.statusCompleted')}
                </div>
                <div className="flex gap-1 sm:gap-2">
                    <button onClick={handleCopyResult} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 transition-colors" title={t('drafting.copyTitle')}><Copy size={16}/></button>
                    <button onClick={handleDownloadResult} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 transition-colors" title={t('drafting.downloadTitle')}><Download size={16}/></button>
                    <button onClick={handleClearResult} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors" title={t('drafting.clearTitle')}><Trash2 size={16}/></button>
                </div>
            </div>
        )}
    </div>
  );
};

export default DraftingPanel;