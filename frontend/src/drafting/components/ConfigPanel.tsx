// FILE: src/drafting/components/ConfigPanel.tsx
// PHOENIX PROTOCOL - CONFIG PANEL V8.0 (FULLY MOBILE-RESPONSIVE + FLUID HEIGHT)

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { FileText, LayoutTemplate, Send, RefreshCw, ChevronDown, BookOpen } from 'lucide-react';
import { ConfigPanelProps } from '../types';
import { getTemplatePlaceholder } from '../utils/templateHelpers';

interface ExtendedConfigPanelProps extends ConfigPanelProps {
  onOpenLibrary: () => void;
}

export const ConfigPanel: React.FC<ExtendedConfigPanelProps> = ({
  t,
  selectedTemplate,
  context,
  isSubmitting,
  onSelectTemplate,
  onChangeContext,
  onSubmit,
  onOpenLibrary,
}) => {
  const placeholder = useMemo(() => getTemplatePlaceholder(selectedTemplate), [selectedTemplate]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const templateGroups = [
    { label: t('drafting.groupCorporate'), options: ['nda', 'mou', 'shareholders', 'sla'] },
    { label: t('drafting.groupEmployment'), options: ['employment_contract', 'termination_notice', 'warning_letter'] },
    { label: t('drafting.groupRealEstate'), options: ['lease_agreement', 'sales_purchase'] },
    { label: t('drafting.groupCompliance'), options: ['terms_conditions', 'privacy_policy'] },
  ];

  const getOptionLabel = (value: string) => {
    const map: Record<string, string> = {
      generic: t('drafting.templateGeneric'),
      nda: t('drafting.templateNDA'),
      mou: t('drafting.templateMoU'),
      shareholders: t('drafting.templateShareholders'),
      sla: t('drafting.templateSLA'),
      employment_contract: t('drafting.templateKontrate'),
      termination_notice: t('drafting.templateTermination'),
      warning_letter: t('drafting.templateWarning'),
      lease_agreement: t('drafting.templateLease'),
      sales_purchase: t('drafting.templateSales'),
      terms_conditions: t('drafting.templateTerms'),
      privacy_policy: t('drafting.templatePrivacy'),
    };
    return map[value] || value;
  };

  const handleSelect = (value: string) => {
    onSelectTemplate(value);
    setIsOpen(false);
  };

  const handleGenerateClick = () => {
    if (typeof onSubmit === 'function') onSubmit();
  };

  const isButtonDisabled = isSubmitting || !context.trim();

  return (
    // TASK 1: Fluid Height Strategy + w-full
    <div className="glass-panel border border-border-main rounded-3xl p-4 sm:p-6 flex flex-col h-full min-h-[500px] max-h-[85vh] lg:max-h-[700px] w-full shrink-0 shadow-sm transition-all duration-300 relative group pointer-events-auto z-10">
      <div className="absolute inset-0 rounded-3xl border border-transparent group-hover:border-primary-start transition-colors duration-300 pointer-events-none" />

      {/* TASK 2: Responsive Header - flex-wrap + gap-y-3 */}
      <div className="flex flex-wrap items-center justify-between gap-y-3 border-b border-border-main pb-5 mb-6 flex-shrink-0">
        {/* Left side: icon + title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center bg-primary-start/10 rounded-xl border border-primary-start/20">
            <FileText className="text-primary-start" size={20} />
          </div>
          <h2 className="text-sm font-black text-text-primary uppercase tracking-widest leading-none">
            {t('drafting.configuration', 'Konfigurimi')}
          </h2>
        </div>

        {/* Right side: Biblioteka button */}
        <button
          onClick={onOpenLibrary}
          className="h-10 flex items-center gap-2 px-4 rounded-xl text-xs font-black uppercase tracking-widest bg-surface hover:bg-hover border border-border-main transition-all"
          title={t('drafting.libraryTooltip', 'Biblioteka e Ligjeve')}
        >
          <BookOpen size={18} />
          <span>{t('drafting.libraryBtn', 'Biblioteka')}</span>
        </button>
      </div>

      {/* TASK 3: Layout Refinement - responsive gap + overflow-y-auto */}
      <div className="flex flex-col gap-4 lg:gap-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {/* Template Selector */}
        <div className="flex-shrink-0 relative z-20">
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">
              {t('drafting.templateLabel')}
            </label>
          </div>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-start pointer-events-none z-10">
              <LayoutTemplate size={16} />
            </div>
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="w-full pl-11 pr-10 py-3.5 bg-surface border border-border-main rounded-xl text-sm font-bold text-text-primary focus:border-primary-start outline-none transition-all appearance-none cursor-pointer flex items-center justify-between pointer-events-auto"
            >
              <span>{getOptionLabel(selectedTemplate)}</span>
              <ChevronDown className={`h-4 w-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {/* TASK 4: Dropdown Safety - already has max-h-60 + z-[9999] */}
            {isOpen && (
              <div
                ref={dropdownRef}
                className="absolute z-[9999] mt-1 w-full bg-white dark:bg-gray-900 border border-border-main rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar"
              >
                <div
                  onClick={() => handleSelect('generic')}
                  className="px-4 py-2 hover:bg-hover cursor-pointer text-sm font-bold text-text-primary"
                >
                  {t('drafting.templateGeneric')}
                </div>
                {templateGroups.map((group) => (
                  <div key={group.label}>
                    <div className="px-4 py-1.5 text-xs font-black uppercase tracking-widest text-text-muted bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 border-y border-border-main/50">
                      {group.label}
                    </div>
                    {group.options.map((opt) => (
                      <div
                        key={opt}
                        onClick={() => handleSelect(opt)}
                        className="px-4 py-2 hover:bg-hover cursor-pointer text-sm font-bold text-text-primary pl-6"
                      >
                        {getOptionLabel(opt)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Context Textarea */}
        <div className="flex-1 flex flex-col min-h-0">
          <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
            {t('drafting.instructionsLabel')}
          </label>
          <textarea
            value={context}
            onChange={(e) => onChangeContext(e.target.value)}
            placeholder={placeholder}
            className="w-full p-5 bg-surface border border-border-main rounded-xl text-sm flex-1 resize-none font-medium text-text-primary focus:border-primary-start outline-none transition-all placeholder:text-text-muted pointer-events-auto"
          />
        </div>

        {/* Primary Action Button */}
        <button
          onClick={handleGenerateClick}
          disabled={isButtonDisabled}
          className="btn-primary w-full h-14 flex items-center justify-center gap-3 mt-2 flex-shrink-0 disabled:opacity-40 shadow-lg shadow-primary-start/20 hover-lift pointer-events-auto"
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