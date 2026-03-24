// FILE: src/drafting/components/ConfigPanel.tsx
// PHOENIX PROTOCOL - CONFIG PANEL V6.4 (EXECUTIVE DESIGN SYSTEM)
// Fixed: added named export.

import React, { useMemo } from 'react';
import { FileText, LayoutTemplate, Lock, Send, RefreshCw } from 'lucide-react';
import { ConfigPanelProps } from '../types';
import { getTemplatePlaceholder } from '../utils/templateHelpers';

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  t,
  isPro,
  selectedTemplate,
  context,
  isSubmitting,
  onSelectTemplate,
  onChangeContext,
  onSubmit,
}) => {
  const placeholder = useMemo(() => getTemplatePlaceholder(selectedTemplate), [selectedTemplate]);

  return (
    <div className="flex flex-col h-auto lg:h-full w-full">
      {/* Executive Header */}
      <div className="flex items-center gap-3 border-b border-border-main pb-5 mb-6 flex-shrink-0">
        <FileText className="text-primary-start" size={20} />
        <h2 className="text-sm font-black text-text-primary uppercase tracking-widest leading-none">
          {t('drafting.configuration', 'Konfigurimi')}
        </h2>
      </div>

      <div className="flex flex-col gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Template Selector Only */}
        <div className="flex-shrink-0">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-black text-text-muted uppercase tracking-widest">
              {t('drafting.templateLabel')}
            </label>
            {!isPro && (
              <span className="text-xs text-warning-start font-black bg-warning-start/10 px-2 py-0.5 rounded border border-warning-start/20 flex items-center gap-1 uppercase tracking-widest">
                <Lock size={10} /> PRO
              </span>
            )}
          </div>
          <div className="relative group">
            <LayoutTemplate className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-start opacity-70 group-hover:opacity-100 transition-opacity" />
            <select
              value={selectedTemplate}
              onChange={(e) => onSelectTemplate(e.target.value)}
              disabled={!isPro}
              className="glass-input w-full pl-11 pr-10 py-3.5 text-sm font-bold appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 bg-canvas border-border-main"
            >
              <option value="generic" className="bg-surface">{t('drafting.templateGeneric')}</option>
              <optgroup label={t('drafting.groupLitigation')} className="bg-surface-secondary italic">
                <option value="padi" className="bg-surface not-italic">{t('drafting.templatePadi')}</option>
                <option value="pergjigje" className="bg-surface not-italic">{t('drafting.templatePergjigje')}</option>
                <option value="kunderpadi" className="bg-surface not-italic">{t('drafting.templateKunderpadi')}</option>
                <option value="ankese" className="bg-surface not-italic">{t('drafting.templateAnkese')}</option>
                <option value="prapësim" className="bg-surface not-italic">{t('drafting.templatePrapesim')}</option>
              </optgroup>
              <optgroup label={t('drafting.groupCorporate')} className="bg-surface-secondary italic">
                <option value="nda" className="bg-surface not-italic">{t('drafting.templateNDA')}</option>
                <option value="mou" className="bg-surface not-italic">{t('drafting.templateMoU')}</option>
                <option value="shareholders" className="bg-surface not-italic">{t('drafting.templateShareholders')}</option>
                <option value="sla" className="bg-surface not-italic">{t('drafting.templateSLA')}</option>
              </optgroup>
              <optgroup label={t('drafting.groupEmployment')} className="bg-surface-secondary italic">
                <option value="employment_contract" className="bg-surface not-italic">{t('drafting.templateKontrate')}</option>
                <option value="termination_notice" className="bg-surface not-italic">{t('drafting.templateTermination')}</option>
                <option value="warning_letter" className="bg-surface not-italic">{t('drafting.templateWarning')}</option>
              </optgroup>
              <optgroup label={t('drafting.groupRealEstate')} className="bg-surface-secondary italic">
                <option value="lease_agreement" className="bg-surface not-italic">{t('drafting.templateLease')}</option>
                <option value="sales_purchase" className="bg-surface not-italic">{t('drafting.templateSales')}</option>
                <option value="power_of_attorney" className="bg-surface not-italic">{t('drafting.templatePoA')}</option>
              </optgroup>
              <optgroup label={t('drafting.groupCompliance')} className="bg-surface-secondary italic">
                <option value="terms_conditions" className="bg-surface not-italic">{t('drafting.templateTerms')}</option>
                <option value="privacy_policy" className="bg-surface not-italic">{t('drafting.templatePrivacy')}</option>
              </optgroup>
            </select>
            <svg className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Dynamic Context Textarea */}
        <div className="flex-1 flex flex-col min-h-0">
          <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-2">
            {t('drafting.instructionsLabel')}
          </label>
          <textarea
            value={context}
            onChange={(e) => onChangeContext(e.target.value)}
            placeholder={placeholder}
            className="glass-input w-full p-5 text-sm flex-1 resize-none custom-scrollbar font-mono leading-relaxed placeholder:text-text-disabled bg-canvas border-border-main"
          />
        </div>

        {/* Primary Action Button */}
        <button
          onClick={onSubmit}
          disabled={isSubmitting || !context.trim()}
          className="btn-primary w-full h-14 flex items-center justify-center gap-3 mt-2 flex-shrink-0 disabled:opacity-40 hover-lift shadow-sm"
        >
          {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
          <span className="uppercase tracking-widest font-black text-xs">
            {isSubmitting ? t('drafting.statusWorking') : t('drafting.generateBtn')}
          </span>
        </button>
      </div>
    </div>
  );
};