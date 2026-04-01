// FILE: src/drafting/ utils/promptConstructor.ts
// PHOENIX PROTOCOL - PROMPT CONSTRUCTOR V8.0 (FULL TAXONOMY & NO UNUSED VARS)

import { TemplateType } from '../types';
import { getDocumentStructureInstructions } from './templateHelpers';

interface LegalSource {
  lawTitle: string;
  lawNumber: string;
  mandatoryArticles?: string[];
  optionalArticles?: string[];
}

// FULL MAPPING: Covers Litigation, Corporate, Employment, and Real Estate
const taxonomyMapping: Partial<Record<TemplateType, { sources: LegalSource[]; role: string; placeholderFields: string[] }>> = {
  // --- LITIGATION ---
  padi: {
    sources: [{ lawTitle: 'Ligji për Procedurën Kontestimore', lawNumber: 'Nr. 03/L-006', mandatoryArticles: ['182', '183', '184'], optionalArticles: ['185', '186', '187'] }],
    role: 'PLAINTIFF’S ATTORNEY (Avokati i Paditësit)',
    placeholderFields: ['EMRI I PADITËSIT', 'EMRI I TË PADITURIT', 'OBJEKTI I PADISË'],
  },
  pergjigje: {
    sources: [{ lawTitle: 'Ligji për Procedurën Kontestimore', lawNumber: 'Nr. 03/L-006', mandatoryArticles: ['182', '185', '186'], optionalArticles: ['187'] }],
    role: 'DEFENSE ATTORNEY (Avokati i të Paditurit)',
    placeholderFields: ['EMRI I TË PADITURIT', 'NUMRI I LËNDËS'],
  },
  ankese: {
    sources: [{ lawTitle: 'Ligji për Procedurën Kontestimore', lawNumber: 'Nr. 03/L-006', mandatoryArticles: ['182', '194', '195'], optionalArticles: ['196'] }],
    role: 'APPELLATE ATTORNEY (Avokati i Ankuesit)',
    placeholderFields: ['EMRI I ANKUESIT', 'NUMRI I AKTIVENDIMIT'],
  },
  kunderpadi: {
    sources: [{ lawTitle: 'Ligji për Procedurën Kontestimore', lawNumber: 'Nr. 03/L-006', mandatoryArticles: ['182', '183', '184', '185'], optionalArticles: [] }],
    role: 'COUNTERCLAIM ATTORNEY (Avokati për Kundërpadi)',
    placeholderFields: ['EMRI I PADITËSIT', 'EMRI I TË PADITURIT'],
  },
  prapësim: {
    sources: [{ lawTitle: 'Ligji për Procedurën Kontestimore', lawNumber: 'Nr. 03/L-006', mandatoryArticles: ['182', '185', '187'], optionalArticles: [] }],
    role: 'ATTORNEY FOR OBJECTION (Avokati për Prapësim)',
    placeholderFields: ['EMRI I PALËS', 'ARSYET E PRAPËSIMIT'],
  },

  // --- CORPORATE & BUSINESS ---
  nda: {
    sources: [{ lawTitle: 'Ligji për Shoqëritë Tregtare', lawNumber: 'Nr. 06/L-016', mandatoryArticles: [], optionalArticles: [] }, { lawTitle: 'Kodi Civil i Republikës së Kosovës', lawNumber: 'Nr. 08/L-281', mandatoryArticles: [], optionalArticles: [] }],
    role: 'CORPORATE COUNSEL (Këshilltar Juridik i Kompanisë)',
    placeholderFields: ['EMRI I KOMPANISË', 'PALËT MARRËS', 'GJOBA'],
  },
  mou: {
    sources: [{ lawTitle: 'Kodi Civil i Republikës së Kosovës', lawNumber: 'Nr. 08/L-281', mandatoryArticles: [], optionalArticles: [] }],
    role: 'CORPORATE COUNSEL (Këshilltar Juridik)',
    placeholderFields: ['PALA A', 'PALA B', 'QËLLIMI'],
  },
  shareholders: {
    sources: [{ lawTitle: 'Ligji për Shoqëritë Tregtare', lawNumber: 'Nr. 06/L-016', mandatoryArticles: ['87', '88', '89'], optionalArticles: [] }],
    role: 'CORPORATE COUNSEL (Këshilltar Juridik)',
    placeholderFields: ['EMRI I KOMPANISË', 'AKSIONARËT', 'PËRQINDJA'],
  },

  // --- EMPLOYMENT ---
  employment_contract: {
    sources: [{ lawTitle: 'Ligji i Punës', lawNumber: 'Nr. 03/L-212', mandatoryArticles: ['10', '11'], optionalArticles: ['12', '15'] }],
    role: 'EMPLOYMENT LAWYER (Avokat i Punës)',
    placeholderFields: ['PUNËDHËNËSI', 'PUNËMARRËSI', 'PAGA', 'POZITA'],
  },
  termination_notice: {
    sources: [{ lawTitle: 'Ligji i Punës', lawNumber: 'Nr. 03/L-212', mandatoryArticles: ['67', '70', '71'], optionalArticles: [] }],
    role: 'EMPLOYMENT LAWYER (Avokat i Punës)',
    placeholderFields: ['PUNËDHËNËSI', 'PUNËMARRËSI', 'DATA E NDËRPRERJES'],
  },

  // --- REAL ESTATE ---
  lease_agreement: {
    sources: [{ lawTitle: 'Kodi Civil i Republikës së Kosovës', lawNumber: 'Nr. 08/L-281', mandatoryArticles: [], optionalArticles: [] }],
    role: 'REAL ESTATE ATTORNEY (Avokat i Patundshmërive)',
    placeholderFields: ['QIRADHËNËSI', 'QIRAMARRËSI', 'ÇMIMI', 'OBJEKTI'],
  }
};

// Fallback is now the Civil Code, which is safe for general business contracts
const defaultTaxonomy = {
  sources: [{ lawTitle: 'Kodi Civil i Republikës së Kosovës', lawNumber: 'Nr. 08/L-281', mandatoryArticles: [], optionalArticles: [] }],
  role: 'SENIOR KOSOVO ATTORNEY (Avokat i Specializuar)',
  placeholderFields: ['TË DHËNA TË MUNGAR'],
};

// Removed TFunction to prevent unused variable errors
export const constructSmartPrompt = (userText: string, template: TemplateType): string => {
  const taxonomy = taxonomyMapping[template] || defaultTaxonomy;

  let legalSourcesInstruction = 'EXCLUSIVE LEGAL SOURCES (hard‑bound taxonomy):\n';
  taxonomy.sources.forEach((source) => {
    legalSourcesInstruction += `- ${source.lawTitle} (${source.lawNumber})\n`;
    if (source.mandatoryArticles && source.mandatoryArticles.length > 0) {
      legalSourcesInstruction += `  * MANDATORY articles: ${source.mandatoryArticles.map(a => `Neni ${a}`).join(', ')}\n`;
    }
    if (source.optionalArticles && source.optionalArticles.length > 0) {
      legalSourcesInstruction += `  * Optional articles (may be used if relevant): ${source.optionalArticles.map((a: string) => `Neni ${a}`).join(', ')}\n`;
    }
  });
  legalSourcesInstruction += `\n**PROHIBITION:** You MUST NOT cite any law, article number, or legal provision that is not listed above. If you need to refer to a provision not in this list, output: "[REFERENCA LIGJORE E NEVOJSHME]".`;

  const placeholderInstruction = `
PLACEHOLDER RULES:
- For ANY missing information (names, dates, numbers, etc.), use uppercase placeholders with underscores.
- Format: \`[PLACEHOLDER_NAME]\` – e.g., \`[EMRI I PADITËSIT]\`.
- Do not invent facts. DO NOT use brackets for any other purpose.
  `;

  const antiHallucination = `
CRITICAL ANTI‑HALLUCINATION DIRECTIVES:
- **ZERO HALLUCINATION.** You are a deterministic compiler, not a creative writer.
- **NO GUESSING:** Never guess article numbers. Use only the taxonomy sources listed above.
- **NO EXTERNAL CITATIONS:** Do not refer to foreign laws.
- **STRUCTURE ONLY:** Your output must be a formal legal document. No meta‑commentary. Begin immediately with the document header.
  `;

  const structureInstructions = getDocumentStructureInstructions(template);

  return `
[SYSTEM MANDATE]
ROLE: ${taxonomy.role}
GOAL: Draft a professional, accurate legal document in Albanian according to the user's request, strictly following the Kosovo Legal Taxonomy.

${legalSourcesInstruction}

${antiHallucination}

${placeholderInstruction}
[/SYSTEM MANDATE]

${structureInstructions}

[USER INPUT DATA]
${userText}

Draft the document. Use markdown for headings. Do not include any meta‑commentary.
  `;
};