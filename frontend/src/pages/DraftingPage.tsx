// FILE: src/pages/DraftingPage.tsx
// PHOENIX PROTOCOL - MOBILE-FRIENDLY DRAFTING PAGE (HEADER REMOVED, BIBLIOTEKA MOVED, LIBRARY RETURN BUTTON ADDED)

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

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

  const switchToLibrary = () => {
    setActiveMode('library');
  };

  const switchToDrafting = () => {
    setActiveMode('drafting');
  };

  return (
    <motion.div className="w-full pb-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-8 flex flex-col h-full">
        <style>{lawyerGradeStyles}</style>

        {activeMode === 'drafting' ? (
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 flex-1 min-h-0 pointer-events-auto">
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
                onOpenLibrary={switchToLibrary}
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
          <>
            {/* Minimal return button - preserves workspace while allowing navigation back */}
            <div className="mb-4">
              <button
                onClick={switchToDrafting}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-text-muted hover:text-primary-start transition-colors"
              >
                <ArrowLeft size={14} />
                <span>{t('drafting.backToDrafting', '← Kthehu te Hartimi')}</span>
              </button>
            </div>
            <div className="flex-1 lg:h-[750px] overflow-hidden">
              <LawSearchPage />
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default DraftingPage;