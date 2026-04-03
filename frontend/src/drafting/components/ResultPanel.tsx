// FILE: src/drafting/components/ResultPanel.tsx
// PHOENIX PROTOCOL - RESULT PANEL V8.2 (RICH TEXT COPY ENABLED)

import React, { useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, AlertCircle, CheckCircle,
  FileText, Trash2, Copy,
  BrainCircuit
} from 'lucide-react';
import { ResultPanelProps } from '../types';
import { ThinkingDots } from './ThinkingDots';
import { DraftResultRenderer } from './DraftResultRenderer';

export const ResultPanel: React.FC<ResultPanelProps> = ({
  t,
  currentJob,
  notification,
  onRetry,
  onClear,
}) => {
  const documentRef = useRef<HTMLDivElement>(null);

  const statusText = useMemo(() => {
    switch (currentJob.status) {
      case 'COMPLETED':
        return t('drafting.statusCompleted', 'Përfunduar');
      case 'FAILED':
        return t('drafting.statusFailed', 'Dështoi');
      case 'PROCESSING':
        return t('drafting.statusWorking', 'Duke Gjeneruar...');
      default:
        return t('drafting.statusResult', 'Rezultati');
    }
  }, [currentJob.status, t]);

  const actionButtonBase = "p-3 bg-surface border border-border-main text-text-primary hover:text-primary-start hover:border-primary-start/50 rounded-xl transition-all shadow-sm hover:shadow-md hover-lift disabled:opacity-30 disabled:hover:shadow-none pointer-events-auto";

  const handleCopy = async () => {
    if (!documentRef.current) return;

    // We clone the inner HTML to ensure we capture the rendered styles (bold, headers)
    const htmlContent = documentRef.current.innerHTML;
    const plainText = documentRef.current.innerText;

    const blobHtml = new Blob([htmlContent], { type: 'text/html' });
    const blobText = new Blob([plainText], { type: 'text/plain' });

    try {
      const data = [new ClipboardItem({ 
        'text/html': blobHtml,
        'text/plain': blobText 
      })];
      await navigator.clipboard.write(data);
      // Optional: Add a subtle "Copied!" feedback here
    } catch (err) {
      console.error("Clipboard write failed:", err);
      // Fallback for older browsers
      navigator.clipboard.writeText(plainText);
    }
  };

  return (
    <div className="glass-panel border border-border-main rounded-3xl p-0 flex flex-col h-auto lg:h-[700px] shadow-sm relative group overflow-visible">
      <div className="absolute inset-0 rounded-3xl border border-transparent group-hover:border-primary-start transition-colors duration-300 pointer-events-none z-[200]" />

      {/* Executive Header Toolbar */}
      <div className="flex justify-between items-center px-6 py-4 bg-surface border-b border-border-main flex-shrink-0 relative z-50 pointer-events-auto">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary-start/10 rounded-xl border border-primary-start/20">
            <BrainCircuit className="text-primary-start" size={20} />
          </div>
          <h3 className="text-text-primary text-xs font-black uppercase tracking-widest leading-none">
            {statusText}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            title={t('drafting.copy', 'Kopjo')}
            disabled={!currentJob.result}
            className={actionButtonBase}
          >
            <Copy size={18} className="stroke-[2.5px] text-text-primary" />
          </button>

          {currentJob.status === 'FAILED' && (
            <button onClick={onRetry} title="Riprovo" className={actionButtonBase}>
              <RefreshCw size={18} className="text-text-primary" />
            </button>
          )}

          <div className="h-6 w-px bg-border-main mx-1" />

          <button
            onClick={onClear}
            title={t('drafting.clear', 'Pastro')}
            disabled={!currentJob.result && currentJob.status !== 'FAILED'}
            className="p-3 bg-surface border border-border-main text-danger-start hover:text-danger-start/80 hover:border-danger-start/30 rounded-xl transition-all disabled:opacity-30 hover-lift pointer-events-auto"
          >
            <Trash2 size={18} className="stroke-[2.5px] text-danger-start" />
          </button>
        </div>
      </div>

      {/* The Paper Reading Surface */}
      <div className="flex-1 bg-surface/30 overflow-y-auto custom-scrollbar p-6 sm:p-10 relative z-10">
        <div className="min-h-full w-full flex justify-center">
          <AnimatePresence mode="wait">
            {currentJob.result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-[21cm]"
              >
                {notification && (
                  <div className={`mb-6 p-4 text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-3 border shadow-sm w-full ${notification.type === 'success' ? 'bg-success-start/10 text-success-start border-success-start/20' : 'bg-danger-start/10 text-danger-start border-danger-start/20'}`}>
                    {notification.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {notification.msg}
                  </div>
                )}
                {/* Captured Ref for HTML Extraction */}
                <div
                  ref={documentRef}
                  className="bg-white p-12 text-black shadow-lg rounded-sm min-h-[29.7cm] border border-gray-200"
                >
                  <DraftResultRenderer text={currentJob.result} t={t} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center text-center mt-32 pointer-events-none opacity-40"
              >
                {currentJob.status === 'PROCESSING' ? (
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-[1.5rem] bg-primary-start flex items-center justify-center shadow-accent-glow mb-8 animate-pulse">
                      <BrainCircuit className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-text-primary font-black uppercase tracking-widest text-xs">
                      {t('drafting.statusWorking', 'Duke Gjeneruar...')}
                      <ThinkingDots />
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <FileText size={64} className="text-text-muted mb-6" strokeWidth={1.5} />
                    <p className="text-text-muted font-black text-xs uppercase tracking-widest">
                      {t('drafting.emptyState', 'Rezultati do të shfaqet këtu')}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};