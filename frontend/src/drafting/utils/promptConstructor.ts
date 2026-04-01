// src/drafting/utils/promptConstructor.ts
import { TFunction } from 'i18next';
import { TemplateType } from '../types';
import { getDocumentStructureInstructions } from './templateHelpers';

// ============================================================
// TAXONOMY MAPPING – Kosovo Legal Sources (Anti‑Hallucination)
// ============================================================
// This maps each template type to its exclusive legal sources.
// The AI is forbidden from citing any law or article not listed here.
interface LegalSource {
  lawTitle: string;
  lawNumber: string;
  mandatoryArticles?: string[]; // articles that must be referenced
  optionalArticles?: string[];  // allowed but not forced
}

// Partial mapping – only templates that have been migrated to the taxonomy.
// For unmapped templates, a fallback will be used.
const taxonomyMapping: Partial<Record<TemplateType, { sources: LegalSource[]; role: string; placeholderFields: string[] }>> = {
  padi: {
    sources: [
      {
        lawTitle: 'Ligji për Procedurën Kontestimore',
        lawNumber: 'Nr. 03/L-006',
        mandatoryArticles: ['182', '183', '184'], // basic procedural requirements
        optionalArticles: ['185', '186', '187'],
      },
      // Family law specific – can be added with sub‑type detection if needed
    ],
    role: 'PLAINTIFF’S ATTORNEY (Avokati i Paditësit)',
    placeholderFields: ['EMRI I PADITËSIT', 'EMRI I TË PADITURIT', 'OBJEKTI I PADISË', 'DATA E NGRITJES SË PADISË'],
  },
  pergjigje: {
    sources: [
      {
        lawTitle: 'Ligji për Procedurën Kontestimore',
        lawNumber: 'Nr. 03/L-006',
        mandatoryArticles: ['182', '185', '186'], // articles relevant to defense response
        optionalArticles: ['187'],
      },
    ],
    role: 'DEFENSE ATTORNEY (Avokati i të Paditurit)',
    placeholderFields: ['EMRI I TË PADITURIT', 'NUMRI I LËNDËS', 'FAKTET E KUNDËRPADISË'],
  },
  ankese: {
    sources: [
      {
        lawTitle: 'Ligji për Procedurën Kontestimore',
        lawNumber: 'Nr. 03/L-006',
        mandatoryArticles: ['182', '194', '195'], // appeal provisions
        optionalArticles: ['196'],
      },
    ],
    role: 'APPELLATE ATTORNEY (Avokati i Ankuesit)',
    placeholderFields: ['EMRI I ANKUESIT', 'NUMRI I AKTIVENDIMIT TË ANKUAR', 'ARSYET E ANKESËS'],
  },
  kunderpadi: {
    sources: [
      {
        lawTitle: 'Ligji për Procedurën Kontestimore',
        lawNumber: 'Nr. 03/L-006',
        mandatoryArticles: ['182', '183', '184', '185'], // cross‑claim provisions
        optionalArticles: [],
      },
    ],
    role: 'COUNTERCLAIM ATTORNEY (Avokati për Kundërpadi)',
    placeholderFields: ['EMRI I PADITËSIT', 'EMRI I TË PADITURIT', 'OBJEKTI I KUNDËRPADISË'],
  },
  prapësim: {
    sources: [
      {
        lawTitle: 'Ligji për Procedurën Kontestimore',
        lawNumber: 'Nr. 03/L-006',
        mandatoryArticles: ['182', '185', '187'], // objection provisions
        optionalArticles: [],
      },
    ],
    role: 'ATTORNEY FOR OBJECTION (Avokati për Prapësim)',
    placeholderFields: ['EMRI I PALËS', 'ARSYET E PRAPËSIMIT'],
  },
  // Add other templates as they are migrated (e.g., divorce, employment, etc.)
};

// Fallback for templates not yet in taxonomy
const defaultTaxonomy = {
  sources: [
    {
      lawTitle: 'Ligji për Procedurën Kontestimore',
      lawNumber: 'Nr. 03/L-006',
      mandatoryArticles: [],
      optionalArticles: [], // Added to match LegalSource interface
    },
  ],
  role: 'SENIOR KOSOVO ATTORNEY (Avokat i Specializuar)',
  placeholderFields: ['TË DHËNA TË MUNGAR'],
};

// ============================================================
// PROMPT CONSTRUCTOR (DETERMINISTIC)
// ============================================================
export const constructSmartPrompt = (userText: string, template: TemplateType, _t: TFunction): string => {
  // 1. Retrieve taxonomy data for the given template, or fallback
  const taxonomy = taxonomyMapping[template] || defaultTaxonomy;

  // 2. Build legal sources instruction (exclusive, no guessing)
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
  legalSourcesInstruction += `\n**PROHIBITION:** You MUST NOT cite any law, article number, or legal provision that is not listed above. If you need to refer to a provision not in this list, you must output a placeholder: "[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]".`;

  // 3. Role instruction
  const roleInstruction = taxonomy.role;

  // 4. Placeholder instruction (standardized syntax)
  const placeholderInstruction = `
PLACEHOLDER RULES:
- For ANY missing information (names, dates, numbers, etc.), use uppercase placeholders with underscores.
- Format: \`[PLACEHOLDER_NAME]\` – e.g., \`[EMRI I PADITËSIT]\`, \`[DATA E DËGJIMIT]\`, \`[SHUMA NË EURO]\`.
- If you are uncertain about a specific required field, use the generic placeholder: \`[TË DHËNA TË MUNGAR]\`.
- DO NOT invent or infer missing facts. DO NOT use brackets for any other purpose.
- DO NOT use placeholders like "[Neni i aplikueshëm ...]"; instead, either cite a concrete article from the taxonomy above, or output the generic missing reference placeholder.
  `;

  // 5. Anti‑hallucination block (strict)
  const antiHallucination = `
CRITICAL ANTI‑HALLUCINATION DIRECTIVES:
- **ZERO HALLUCINATION.** You are a deterministic compiler, not a creative writer.
- **NO GUESSING:** Never guess article numbers, law names, or legal principles. Use only the taxonomy sources listed above.
- **NO INFERENCE:** If the user input lacks a necessary fact, output the corresponding placeholder. Do not assume.
- **NO EXTERNAL CITATIONS:** Do not refer to foreign laws, international instruments, or any law not explicitly in the taxonomy.
- **STRUCTURE ONLY:** Your output must be a formal legal document with headers, sections, and placeholders. No meta‑commentary or explanation outside the document.
  `;

  // 6. Structure instructions (from helper, unchanged)
  const structureInstructions = getDocumentStructureInstructions(template);

  // 7. Build the final prompt
  return `
[SYSTEM MANDATE]
ROLE: ${roleInstruction}
GOAL: Draft a professional, accurate legal document in Albanian according to the user's request, strictly following the Kosovo Legal Taxonomy.

${legalSourcesInstruction}

${antiHallucination}

${placeholderInstruction}
[/SYSTEM MANDATE]

${structureInstructions}

[USER INPUT DATA]
${userText}

Now, draft the document. Use markdown for headings (### for sections) and bold for emphasis where appropriate. Do not include any meta‑commentary outside the document.
  `;
};