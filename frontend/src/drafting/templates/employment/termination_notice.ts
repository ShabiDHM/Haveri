// src/drafting/templates/employment/termination_notice.ts
import { TemplateConfig } from '../../types';

export const terminationNoticeTemplate: TemplateConfig = {
  structureInstructions: `
FORMAT: Termination notice (Lajmërim për Ndërprerje të Marrëdhënies së Punës) under Kosovo law. Use formal Albanian legal language.

MANDATORY SECTIONS (in order):
1. **HEADER:** \`LAJMËRIM PËR NDËRPRERJE TË MARRËDHËNIES SË PUNËS\` centered, bold.

2. **DATA E LËSHIMIT:** \`[DATA E DORËZIMIT]\`

3. **PALËT:**
   - **Punëdhënësi:** \`[EMRI I PUNËDHËNËSIT]\`, adresa: \`[ADRESA]\`
   - **Punëmarrësi:** \`[EMRI I PUNËMARRËSIT]\`, pozita: \`[POZITA]\`

4. **DATA E NDËRPRERJES:** \`[DATA E PËRFUNDIMIT TË MARRËDHËNIES]\`

5. **ARSYEJA PËR NDËRPRERJE:** Clearly state the reason, referencing the applicable provisions of the Labour Law if relevant. Use placeholders for specifics.

6. **PERIUDHA E NJOFTIMIT:** \`[PERIUDHA E NJOFTIMIT] ditë/javë/muaj\` (or immediate termination if justified).

7. **PAGESA PËRFUNDIMTARE:** Obligation to pay outstanding salary, unused annual leave, and any severance. Use placeholders for amounts.

8. **DISPOZITAT LIGJORE (BAZA LIGJORE):** This section must cite only Kosovo laws provided in the taxonomy above. Use the exact law titles and numbers. For article references:
    - If the taxonomy lists specific articles, cite them exactly (e.g., "Neni [X] i Ligjit Nr. 03/L-212 të Punës").
    - If an article is needed but not listed in the taxonomy, output the placeholder: \`[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]\`.
    - **DO NOT** invent article numbers or use vague phrases like "Neni përkatës".
    - Include a statement: \`Ky lajmërim bazohet në dispozitat e Ligjit të Punës të Republikës së Kosovës.\`

9. **NËNSHKRIMI:**
    \`\`\`
    Punëdhënësi: ____________________
    (Emri dhe nënshkrimi)
    \`\`\`

IMPORTANT RULES:
- Use uppercase placeholders with underscores: \`[PLACEHOLDER_NAME]\`.
- Never replace a placeholder with invented data.
- Maintain formal tone.
  `,
  placeholder: "Shembull: Punonjësi ka shkelur rregullat e brendshme dhe duhet të ndërpresim kontratën me të.",
  label: "Lajmërim për Ndërprerje",
};