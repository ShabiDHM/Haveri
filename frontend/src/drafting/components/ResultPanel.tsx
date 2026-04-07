// FILE: src/drafting/components/ResultPanel.tsx
// PHOENIX PROTOCOL - ICON-ONLY ACTIONS, SYNCED HEIGHT WITH CONFIG PANEL

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

  // Icon-only buttons: fixed height (h-10), square width (w-10), centered icon
  const iconButtonBase = "h-10 w-10 flex items-center justify-center rounded-xl bg-surface border border-border-main text-text-primary hover:text-primary-start hover:border-primary-start/50 transition-all shadow-sm hover:shadow-md hover-lift disabled:opacity-30 disabled:hover:shadow-none pointer-events-auto";

  const handleCopy = async () => {
    if (!documentRef.current) return;

    const clone = documentRef.current.cloneNode(true) as HTMLElement;

    const styleElement = (el: HTMLElement) => {
      const tag = el.tagName.toLowerCase();
      
      el.style.fontFamily = 'Times New Roman, serif';
      el.style.lineHeight = '1.6';

      if (tag === 'h1' || tag === 'h2') {
        el.style.textTransform = 'uppercase';
        el.style.fontWeight = '900';
        el.style.textAlign = 'center';
        el.style.fontSize = tag === 'h1' ? '20pt' : '16pt';
        el.style.margin = '20px 0';
      } else if (tag === 'p' || tag === 'li') {
        el.style.fontSize = '12pt';
        el.style.marginBottom = '10px';
        el.style.textAlign = 'justify';
      } else if (tag === 'strong') {
        el.style.fontWeight = 'bold';
      }
      
      if (el.className && el.className.includes('bg-yellow-100')) {
        el.style.backgroundColor = '#fef08a';
        el.style.padding = '2px 4px';
        el.style.border = '1px solid #fde047';
        el.style.fontWeight = 'bold';
      }

      Array.from(el.children).forEach(child => styleElement(child as HTMLElement));
    };

    styleElement(clone);

    const html = `
      <div style="background: white; padding: 50px; color: black; max-width: 800px; margin: auto;">
        ${clone.innerHTML}
      </div>
    `;

    try {
      const data = [new ClipboardItem({ 
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([documentRef.current.innerText], { type: 'text/plain' }) 
      })];
      await navigator.clipboard.write(data);
    } catch (err) {
      console.error("Rich text copy failed:", err);
      navigator.clipboard.writeText(documentRef.current.innerText);
    }
  };

  return (
    <div className="glass-panel border border-border-main rounded-3xl p-0 flex flex-col h-auto lg:h-[700px] shadow-sm relative group overflow-visible">
      <div className="absolute inset-0 rounded-3xl border border-transparent group-hover:border-primary-start transition-colors duration-300 pointer-events-none z-[200]" />

      {/* Header - identical structure to ConfigPanel */}
      <div className="flex justify-between items-center border-b border-border-main pb-5 mb-0 px-6 pt-5 flex-shrink-0 relative z-50 pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center bg-primary-start/10 rounded-xl border border-primary-start/20">
            <BrainCircuit className="text-primary-start" size={20} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-widest leading-none">
            {statusText}
          </h3>
        </div>

        {/* Right actions: icon-only buttons, each exactly h-10 w-10 */}
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} title={t('drafting.copy', 'Kopjo')} disabled={!currentJob.result} className={iconButtonBase}>
            <Copy size={18} className="stroke-[2.5px]" />
          </button>
          {currentJob.status === 'FAILED' && (
            <button onClick={onRetry} title="Riprovo" className={iconButtonBase}>
              <RefreshCw size={18} />
            </button>
          )}
          <div className="h-6 w-px bg-border-main mx-1" />
          <button onClick={onClear} title={t('drafting.clear', 'Pastro')} disabled={!currentJob.result && currentJob.status !== 'FAILED'} className={iconButtonBase}>
            <Trash2 size={18} className="stroke-[2.5px]" />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-surface/30 overflow-y-auto custom-scrollbar p-6 sm:p-10 relative z-10">
        <div className="min-h-full w-full flex justify-center">
          <AnimatePresence mode="wait">
            {currentJob.result ? (
              <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-[21cm]">
                {notification && (
                  <div className={`mb-6 p-4 text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-3 border shadow-sm w-full ${notification.type === 'success' ? 'bg-success-start/10 text-success-start border-success-start/20' : 'bg-danger-start/10 text-danger-start border-danger-start/20'}`}>
                    {notification.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {notification.msg}
                  </div>
                )}
                <div ref={documentRef} className="bg-white p-12 text-black shadow-lg rounded-sm min-h-[29.7cm] border border-gray-200">
                  <DraftResultRenderer text={currentJob.result} t={t} />
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center text-center mt-32 pointer-events-none opacity-40">
                {currentJob.status === 'PROCESSING' ? (
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 rounded-xl bg-primary-start/10 border border-primary-start/20 flex items-center justify-center mb-4 animate-pulse">
                      <BrainCircuit className="w-5 h-5 text-primary-start" />
                    </div>
                    <p className="text-text-primary font-black uppercase tracking-widest text-xs">
                      {t('drafting.statusWorking', 'Duke Gjeneruar...')}
                      <ThinkingDots />
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <FileText size={48} className="text-text-muted mb-4" strokeWidth={1.5} />
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