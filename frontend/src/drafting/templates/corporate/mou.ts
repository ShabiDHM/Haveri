// src/drafting/templates/corporate/mou.ts
import { TemplateConfig } from '../../types';

export const mouTemplate: TemplateConfig = {
  structureInstructions: `
FORMAT: Memorandum of Understanding (Memorandum Bashkëpunimi) – a formal document outlining the intent of parties to collaborate. Use formal Albanian legal language.

MANDATORY SECTIONS (in order):
1. **HEADER:** 
   - \`MEMORANDUM BASHKËPUNIMI\` centered, bold.
   - Placeholder for date: \`[DATA E NËNSHKRIMIT]\`

2. **PALËT:**
   - **Palët nënshkruese:**
     - \`[EMRI I PALËS SË PARË]\`, me seli në \`[ADRESA]\`, të përfaqësuar nga \`[PËRFAQËSUESI]\`
     - \`[EMRI I PALËS SË DYTË]\`, me seli në \`[ADRESA]\`, të përfaqësuar nga \`[PËRFAQËSUESI]\`

3. **QËLLIMI I MEMORANDUMIT:** [PËRSHKRIM I SHKURTËR I QËLLIMIT]

4. **FUSHAT E BASHKËPUNIMIT:** List of collaboration areas. Use placeholders for specifics:
   - \`[FUSHA 1: PËRSHKRIM]\`
   - \`[FUSHA 2: PËRSHKRIM]\`

5. **OBLIGIMET E PALËVE:** Outline what each party agrees to do during the collaboration period.

6. **AFATI:** \`[DATA FILLIMIT]\` deri më \`[DATA MBARIMIT]\`

7. **DISPOZITAT LIGJORE (BAZA LIGJORE):** This section must cite only Kosovo laws provided in the taxonomy above. If a legal reference is needed, use exact law titles and numbers. For article references:
   - If the taxonomy lists specific articles, cite them exactly (e.g., "Neni [X] i Ligjit për Detyrimet (Kontrata)").
   - If an article is needed but not listed in the taxonomy, output the placeholder: \`[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]\`.
   - **DO NOT** invent article numbers or use vague phrases like "Neni përkatës".
   - If the document is intended to be non-binding, include a clear statement: "Ky memorandum nuk përbën kontratë ligjërisht të detyrueshme, përveç dispozitave për konfidencialitetin dhe zgjidhjen e mosmarrëveshjeve."

8. **ZGJIDHJA E MOSMARRËVESHJEVE:** \`[METODA: negocim / arbitrazh / gjykata kompetente në [QYTETI]]\`

9. **NËNSHKRIMET:**
   \`\`\`
   Për palën e parë: ____________________
   (Emri dhe nënshkrimi)
   Për palën e dytë: ____________________
   (Emri dhe nënshkrimi)
   \`\`\`

IMPORTANT RULES:
- Use uppercase placeholders with underscores: \`[PLACEHOLDER_NAME]\`.
- Never replace a placeholder with invented data.
- Maintain formal tone.
  `,
  placeholder: "Shembull: Dy kompanitë tona duan të bashkëpunojnë për një projekt të përbashkët dhe duan të përshkruajnë qëllimet para kontratës finale.",
  label: "Memorandum Bashkëpunimi (MoU)",
};