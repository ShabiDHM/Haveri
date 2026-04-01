// FILE: src/pages/DraftingPage.tsx
// PHOENIX PROTOCOL - CLEAN LAYOUT V2 (Fixed prompt arguments)

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PenTool, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

import { TemplateType, DraftingJobState, NotificationState } from '../drafting/types';
import { ConfigPanel } from '../drafting/components/ConfigPanel';
import { ResultPanel } from '../drafting/components/ResultPanel';
import { constructSmartPrompt } from '../drafting/utils/promptConstructor';
import LawSearchPage from './LawSearchPage';

const lawyerGradeStyles = `
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-main); border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--primary-start); }
`;

type Mode = 'drafting' | 'library';

const DraftingPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeMode, setActiveMode] = useState<Mode>('drafting');

  // Drafting state
  const [context, setContext] = useState(() => localStorage.getItem('drafting_context') || '');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('generic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [currentJob, setCurrentJob] = useState<DraftingJobState>(() => {
    const saved = localStorage.getItem('drafting_job');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.status === 'PROCESSING')
          return parsed.result ? { ...parsed, status: 'COMPLETED' } : { ...parsed, status: 'FAILED', error: 'Interrupted' };
        return parsed;
      } catch {
        return { status: null, result: null, error: null };
      }
    }
    return { status: null, result: null, error: null };
  });

  const isPro = useMemo(() => user?.plan_tier === 'GROWTH' || user?.plan_tier === 'ENTERPRISE' || user?.role === 'ADMIN', [user]);

  useEffect(() => {
    localStorage.setItem('drafting_context', context);
  }, [context]);

  useEffect(() => {
    localStorage.setItem('drafting_job', JSON.stringify(currentJob));
  }, [currentJob]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const runDraftingStream = async () => {
    if (!context.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setCurrentJob({ status: 'PROCESSING', result: '', error: null });
    setNotification(null);
    let acc = '';
    try {
      const stream = await apiService.draftLegalDocumentStream({
        // SURGICAL FIX: Removed 't' argument to match the new promptConstructor signature
        user_prompt: constructSmartPrompt(context.trim(), selectedTemplate),
        document_type: isPro ? selectedTemplate : 'generic',
      });
      for await (const chunk of stream) {
        acc += chunk;
        setCurrentJob(prev => ({ ...prev, result: acc }));
      }
      setCurrentJob(prev => ({ ...prev, status: 'COMPLETED' }));
    } catch (e: any) {
      setCurrentJob(prev => ({ ...prev, status: 'FAILED', error: e.message || t('common.error') }));
      setNotification({ msg: t('drafting.statusFailed'), type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveToArchive = async () => {
    if (!currentJob.result) return;
    setSaving(true);
    try {
      const blob = new Blob([currentJob.result], { type: 'text/plain;charset=utf-8' });
      const fileName = `draft-${selectedTemplate}-${Date.now()}.txt`;
      await apiService.uploadArchiveItem(new File([blob], fileName), fileName, 'DRAFT');
      setNotification({ msg: t('drafting.savedToArchive'), type: 'success' });
    } catch (err) {
      setNotification({ msg: t('drafting.saveFailed'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const clearJob = () => {
    if (currentJob.result && !window.confirm(t('drafting.confirmClear'))) return;
    setCurrentJob({ status: null, result: null, error: null });
    setContext('');
  };

  const retry = () => {
    runDraftingStream();
  };

  const handleModeSwitch = (mode: Mode) => {
    setActiveMode(mode);
  };

  return (
    <motion.div className="w-full pb-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8 flex flex-col h-full">
        <style>{lawyerGradeStyles}</style>

        {/* PHOENIX DIRECTIVE: Unified Executive Header (glass-panel) */}
        <div className="glass-panel p-6 sm:p-8 mb-6 border border-border-main flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-start/10 flex items-center justify-center text-primary-start shadow-sm border border-primary-start/20">
              {activeMode === 'drafting' ? <PenTool size={24} /> : <BookOpen size={24} />}
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tighter uppercase leading-none">
                {activeMode === 'drafting' ? t('drafting.title', 'Hartimi Ligjor') : 'Biblioteka e Ligjeve'}
              </h2>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mt-1 ml-1">
                {activeMode === 'drafting' ? 'Gjenerim Inteligjent i Dokumenteve' : 'Hulumtim në bazën ligjore të Kosovës'}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto flex bg-surface/50 p-1.5 rounded-2xl gap-1 border border-border-main shadow-inner">
            <button
              onClick={() => handleModeSwitch('drafting')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeMode === 'drafting'
                  ? 'bg-primary-start text-white shadow-md'
                  : 'text-text-muted hover:text-text-primary hover:bg-hover'
              }`}
            >
              <span className="flex items-center justify-center gap-2"><PenTool size={14} /> Hartim</span>
            </button>
            <button
              onClick={() => handleModeSwitch('library')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeMode === 'library'
                  ? 'bg-primary-start text-white shadow-md'
                  : 'text-text-muted hover:text-text-primary hover:bg-hover'
              }`}
            >
              <span className="flex items-center justify-center gap-2"><BookOpen size={14} /> Biblioteka</span>
            </button>
          </div>
        </div>

        {activeMode === 'drafting' ? (
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 flex-1 lg:h-[750px] min-h-0 pointer-events-auto">
            <div className="h-full overflow-y-auto custom-scrollbar">
              <ConfigPanel
                t={t}
                isPro={isPro}
                selectedTemplate={selectedTemplate}
                context={context}
                isSubmitting={isSubmitting}
                onSelectTemplate={(val: string) => setSelectedTemplate(val as TemplateType)}
                onChangeContext={setContext}
                onSubmit={runDraftingStream}
              />
            </div>
            <div className="h-full overflow-y-auto custom-scrollbar">
              <ResultPanel
                t={t}
                currentJob={currentJob}
                saving={saving}
                notification={notification}
                onSave={handleSaveToArchive}
                onRetry={retry}
                onClear={clearJob}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 lg:h-[750px] overflow-hidden">
            <LawSearchPage />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DraftingPage;