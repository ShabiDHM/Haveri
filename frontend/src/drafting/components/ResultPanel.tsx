// FILE: src/drafting/components/ResultPanel.tsx
// PHOENIX PROTOCOL - RESULT PANEL V8.1 (FIXED TYPES & CLEANED IMPORTS)

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, AlertCircle, CheckCircle,
  FileText, Trash2, Archive, Copy, Download,
  BrainCircuit
} from 'lucide-react';
import { ResultPanelProps } from '../types';
import { DraftResultRenderer } from './DraftResultRenderer';

export const ResultPanel: React.FC<ResultPanelProps> = ({
  t,
  currentJob,
  saving,
  notification,
  onSave,
  onRetry,
  onClear,
}) => {
  const [editableContent, setEditableContent] = useState('');

  useEffect(() => {
    if (currentJob.result) {
      setEditableContent(currentJob.result);
    }
  }, [currentJob.result]);

  const statusText = useMemo(() => {
    switch (currentJob.status) {
      case 'COMPLETED': return t('drafting.statusCompleted');
      case 'FAILED': return t('drafting.statusFailed');
      case 'PROCESSING': return t('drafting.statusWorking');
      default: return t('drafting.statusResult', 'Rezultati');
    }
  }, [currentJob.status, t]);

  const actionButtonBase = "p-3 bg-surface border border-border-main text-text-primary hover:text-primary-start hover:border-primary-start/50 rounded-xl transition-all shadow-sm hover:shadow-md hover-lift disabled:opacity-30 disabled:hover:shadow-none pointer-events-auto";

  return (
    <div className="glass-panel border border-border-main rounded-3xl p-0 flex flex-col h-auto lg:h-[700px] shadow-sm relative group overflow-visible">
      <div className="absolute inset-0 rounded-3xl border border-transparent group-hover:border-primary-start transition-colors duration-300 pointer-events-none z-[200]" />

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
          <button onClick={onSave} title={t('drafting.saveToArchive')} disabled={!currentJob.result || saving} className={actionButtonBase}>
            {saving ? <RefreshCw className="animate-spin" size={18} /> : <Archive size={18} className="stroke-[2.5px] text-text-primary" />}
          </button>
          
          <button onClick={() => navigator.clipboard.writeText(editableContent)} title={t('drafting.copy')} disabled={!currentJob.result} className={actionButtonBase}>
            <Copy size={18} className="stroke-[2.5px] text-text-primary" />
          </button>

          <button
            onClick={() => {
              const blob = new Blob([editableContent], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `draft-${Date.now()}.txt`; a.click(); URL.revokeObjectURL(url);
            }}
            title={t('drafting.download')} disabled={!currentJob.result} className={actionButtonBase}
          >
            <Download size={18} className="stroke-[2.5px] text-text-primary" />
          </button>

          {currentJob.status === 'FAILED' && (
            <button onClick={onRetry} title="Riprovo" className={actionButtonBase}>
              <RefreshCw size={18} className="text-text-primary" />
            </button>
          )}

          <div className="h-6 w-px bg-border-main mx-1" />

          <button onClick={onClear} title={t('drafting.clear')} disabled={!currentJob.result && currentJob.status !== 'FAILED'} className="p-3 bg-surface border border-border-main text-danger-start hover:text-danger-start/80 hover:border-danger-start/30 rounded-xl transition-all disabled:opacity-30 hover-lift pointer-events-auto">
            <Trash2 size={18} className="stroke-[2.5px] text-danger-start" />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-surface/30 overflow-y-auto custom-scrollbar p-6 sm:p-10 relative z-10">
        <div className="min-h-full w-full flex justify-center">
          <AnimatePresence mode="wait">
            {currentJob.result ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-[21cm]">
                {notification && (
                  <div className={`mb-6 p-4 text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-3 border shadow-sm w-full ${notification.type === 'success' ? 'bg-success-start/10 text-success-start border-success-start/20' : 'bg-danger-start/10 text-danger-start border-danger-start/20'}`}>
                    {notification.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {notification.msg}
                  </div>
                )}
                <div className="bg-white shadow-lg rounded-sm min-h-[29.7cm] border border-gray-200 p-12">
                  {/* FIXED: Removed 't' prop, kept onChange */}
                  <DraftResultRenderer text={editableContent} onChange={setEditableContent} />
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center text-center mt-32 opacity-40">
                <FileText size={64} className="text-text-muted mb-6" />
                <p className="text-text-muted font-black text-xs uppercase tracking-widest">{t('drafting.emptyState', 'Rezultati do të shfaqet këtu')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};