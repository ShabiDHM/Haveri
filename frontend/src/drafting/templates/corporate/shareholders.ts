// src/drafting/templates/corporate/shareholders.ts
import { TemplateConfig } from '../../types';

export const shareholdersTemplate: TemplateConfig = {
  structureInstructions: `
FORMAT: Standard shareholders' agreement (Marrëveshje e Ortakëve) under Kosovo law. Use formal Albanian legal language.

MANDATORY SECTIONS (in order):
1. **HEADER:** \`MARRËVESHJE E ORTAKËVE\` centered, bold.

2. **DATE AND PARTIES:**
   \`\`\`
   Kjo marrëveshje lidhet sot, më [DATA E LIDHJES], ndërmjet:
   1. [EMRI I ORTAKUT 1], me adresë [ADRESA], i/e përfaqësuar nga [PËRFAQËSUESI], dhe
   2. [EMRI I ORTAKUT 2], me adresë [ADRESA], i/e përfaqësuar nga [PËRFAQËSUESI],
   (në tekstin e mëtejmë të quajtur "Ortakët").
   \`\`\`

3. **PREAMBULA (DUKE PASUR PARASYSH):** Recitals explaining the context and objectives of the agreement. Use placeholders as needed.

4. **PËRKUFIZIMET:** Define key terms if necessary (e.g., "Shoqëria", "Kapitali", "Asambleja").

5. **KAPITALI DHE AKSIONET:** Specify share capital, number of shares, classes, and ownership percentages. Use placeholders:
   - \`[Shoqëria: Emri i shoqërisë]\`
   - \`[Kapitali total: SHUMA NË EURO]\`
   - \`[Ortaku 1: [NUMRI] aksione, [PËRQINDJA]%]\`
   - \`[Ortaku 2: [NUMRI] aksione, [PËRQINDJA]%]\`

6. **MENAXHIMI DHE VENDIMMARRJA:** Structure of management, board composition, decision‑making thresholds, reserved matters.

7. **POLITIKA E DIVIDENDIT:** Conditions for distribution of profits, frequency, and approval process.

8. **TRANSFERIMI I AKSIONEVE:** Restrictions on transfer, right of first refusal, tag‑along, drag‑along (if applicable).

9. **ZGJIDHJA E MOSMARRËVESHJEVE:** \`[METODA: negocim / arbitrazh / gjykata kompetente në [QYTETI]]\`

10. **BAZA LIGJORE:** This section must cite only Kosovo laws provided in the taxonomy above. Use the exact law titles and numbers. For article references:
    - If the taxonomy lists specific articles, cite them exactly (e.g., "Neni [X] i Ligjit Nr. 06/L-016 për Shoqëritë Tregtare").
    - If an article is needed but not listed in the taxonomy, output the placeholder: \`[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]\`.
    - **DO NOT** invent article numbers or use vague phrases like "Neni përkatës".
    - Include a governing law clause: \`Kjo marrëveshje rregullohet nga ligji i Republikës së Kosovës.\`

11. **AFATI DHE PËRFUNDIMI:** Duration of the agreement, termination conditions.

12. **NËNSHKRIMET:**
    \`\`\`
    Për Ortakun 1: ____________________
    (Emri dhe nënshkrimi)
    Për Ortakun 2: ____________________
    (Emri dhe nënshkrimi)
    \`\`\`

IMPORTANT RULES:
- Use uppercase placeholders with underscores: \`[PLACEHOLDER_NAME]\`.
- Never replace a placeholder with invented data.
- **Do not use court styling** (no "GJYKATA", "PADITËSI", "PETITUMI").
- Maintain formal tone.
  `,
  placeholder: "Shembull: Dua të krijoj një marrëveshje ortakërie për një biznes të ri me dy partnerë: unë, Fatmir Berisha, dhe shoku im Labinot Gashi. Do të kemi 50% secili, dhe dua të përcaktojmë menaxhimin dhe ndarjen e fitimit.",
  label: "Marrëveshje e Ortakëve",
};