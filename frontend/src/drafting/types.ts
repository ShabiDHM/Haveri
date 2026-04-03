// src/drafting/types.ts
// PHOENIX PROTOCOL - DRAFTING TYPES V7.1 (REMOVED LITIGATION & POWER OF ATTORNEY)

import { TFunction } from 'i18next';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type TemplateType =
  | 'generic' 
  // Removed litigation: 'padi', 'pergjigje', 'kunderpadi', 'ankese', 'prapësim'
  | 'nda' 
  | 'mou' 
  | 'shareholders' 
  | 'sla'
  | 'employment_contract' 
  | 'termination_notice' 
  | 'warning_letter'
  | 'terms_conditions' 
  | 'privacy_policy'
  | 'lease_agreement' 
  | 'sales_purchase';
  // Removed 'power_of_attorney'

export interface DraftingJobState {
  status: JobStatus | null;
  result: string | null;
  error: string | null;
}

export interface NotificationState {
  msg: string;
  type: 'success' | 'error';
}

export interface TemplateConfig {
  structureInstructions: string;
  placeholder: string;
  label: string;
}

// Props for ConfigPanel
export interface ConfigPanelProps {
  t: TFunction;
  isPro: boolean;
  selectedTemplate: TemplateType;
  context: string;
  isSubmitting: boolean;
  onSelectTemplate: (val: string) => void;
  onChangeContext: (val: string) => void;
  onSubmit: () => void;
}

// Props for ResultPanel - NO CASE REFERENCES
export interface ResultPanelProps {
  t: TFunction;
  currentJob: DraftingJobState;
  saving: boolean;
  notification: NotificationState | null;
  onSave: () => void;
  onRetry: () => void;
  onClear: () => void;
}