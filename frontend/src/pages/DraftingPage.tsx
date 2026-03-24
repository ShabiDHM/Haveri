// FILE: src/pages/DraftingPage.tsx
// PHOENIX PROTOCOL - DRAFTING PAGE V7.5 (EXECUTIVE GLASS ARCHITECTURE)

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PenTool } from 'lucide-react';
import { motion } from 'framer-motion';

import { TemplateType, DraftingJobState, NotificationState } from '../drafting/types';
import { ConfigPanel } from '../drafting/components/ConfigPanel';
import { ResultPanel } from '../drafting/components/ResultPanel';
import { constructSmartPrompt } from '../drafting/utils/promptConstructor';

const lawyerGradeStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap');

  .legal-document {
    font-family: 'Tinos', 'Times New Roman', serif;
    background: white;
    color: black;
    padding: 2.5cm 2cm;
    line-height: 1.5;
    font-size: 12pt;
    text-align: justify;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    margin: 0 auto;
    width: 21cm;
    max-width: 100%;
    box-sizing: border-box;
    min-height: 29.7cm;
    position: relative;
  }

  @media print {
    @page { margin: 2cm; size: A4; }
    body * { visibility: hidden; }
    .legal-document, .legal-document * { visibility: visible; }
    .legal-document {
      position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0;
      box-shadow: none; border: none;
    }
  }

  .legal-content h1 { text-align: center; text-transform: uppercase; font-weight: 700; font-size: 14pt; margin-bottom: 24pt; border-bottom: 2px solid #000; padding-bottom: 4pt; }
  .legal-content h2 { text-transform: uppercase; font-weight: 700; font-size: 12pt; margin-top: 18pt; margin-bottom: 12pt; text-align: center; }
  .legal-content h3 { font-weight: 700; font-size: 12pt; margin-top: 12pt; margin-bottom: 6pt; text-transform: uppercase; text-align: left; }
  .legal-content p { margin-bottom: 12pt; }
  .legal-content strong, .legal-content b { font-weight: 700 !important; }
  .legal-content blockquote { border: none; margin: 3cm 0 0 50%; padding: 0; text-align: center; font-style: normal; font-weight: 700; }
`;

const DraftingPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
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
        user_prompt: constructSmartPrompt(context.trim(), selectedTemplate, t),
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full overflow-hidden bg-canvas"
    >
      <div className="h-full flex flex-col overflow-hidden p-6 sm:p-8">
        <style>{lawyerGradeStyles}</style>

        {/* Executive Header */}
        <div className="flex items-center gap-4 mb-8 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-primary-start/10 flex items-center justify-center text-primary-start shadow-sm">
            <PenTool size={24} />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tighter leading-none">
              {t('drafting.title')}
            </h1>
            <p className="text-sm text-text-muted mt-1">{t('drafting.subtitle')}</p>
          </div>
        </div>

        {/* Outer glass panel – same as FinanceTab */}
        <div className="glass-panel bg-canvas border border-border-main shadow-sm rounded-3xl p-6 sm:p-8 flex-1 min-h-0">
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
            {/* Config Panel – now uses bg-surface/30 (like FinanceTab stats cards) */}
            <div className="h-full overflow-y-auto custom-scrollbar pr-2">
              <div className="bg-surface/30 backdrop-blur-sm border border-border-main rounded-3xl p-6 sm:p-8 h-full">
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
            </div>

            {/* Result Panel – same styling */}
            <div className="h-full overflow-y-auto custom-scrollbar pl-2">
              <div className="bg-surface/30 backdrop-blur-sm border border-border-main rounded-3xl p-6 sm:p-8 h-full">
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
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DraftingPage;