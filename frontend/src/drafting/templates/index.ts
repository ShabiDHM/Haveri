// FILE: src/drafting/templates/index.ts
// PHOENIX PROTOCOL - TEMPLATE INDEX (BUSINESS ONLY)

import { TemplateConfig, TemplateType } from '../types';

import { genericTemplate } from './generic';
import { ndaTemplate } from './corporate/nda';
import { mouTemplate } from './corporate/mou';
import { shareholdersTemplate } from './corporate/shareholders';
import { slaTemplate } from './corporate/sla';
import { employmentContractTemplate } from './employment/employment_contract';
import { terminationNoticeTemplate } from './employment/termination_notice';
import { warningLetterTemplate } from './employment/warning_letter';
import { leaseAgreementTemplate } from './real_estate/lease_agreement';
import { salesPurchaseTemplate } from './real_estate/sales_purchase';
import { termsConditionsTemplate } from './compliance/terms_conditions';
import { privacyPolicyTemplate } from './compliance/privacy_policy';

// No wrapper – each template is fully self‑contained (wrapper removed as per previous changes)
export const templateConfigs: Record<TemplateType, TemplateConfig> = {
  generic: genericTemplate,
  nda: ndaTemplate,
  mou: mouTemplate,
  shareholders: shareholdersTemplate,
  sla: slaTemplate,
  employment_contract: employmentContractTemplate,
  termination_notice: terminationNoticeTemplate,
  warning_letter: warningLetterTemplate,
  lease_agreement: leaseAgreementTemplate,
  sales_purchase: salesPurchaseTemplate,
  terms_conditions: termsConditionsTemplate,
  privacy_policy: privacyPolicyTemplate,
};