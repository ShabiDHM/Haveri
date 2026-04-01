// src/drafting/templates/employment/warning_letter.ts
import { TemplateConfig } from '../../types';

export const warningLetterTemplate: TemplateConfig = {
  structureInstructions: `
FORMAT: Written warning (Vërejtje me Shkrim) to an employee under Kosovo law. Use formal Albanian legal language.

MANDATORY SECTIONS (in order):
1. **HEADER:** \`VËREJTJE ME SHRKIM\` centered, bold.

2. **DATA:** \`[DATA E LËSHIMIT]\`

3. **PALËT:**
   - **Punëdhënësi:** \`[EMRI I PUNËDHËNËSIT]\`
   - **Punëmarrësi:** \`[EMRI I PUNËMARRËSIT]\`, pozita: \`[POZITA]\`

4. **PËRSHKRIMI I SHKELJES:** Detailed description of the violation or performance issue. Use placeholders for specifics.

5. **DISCUSSIONS PREVIOUS (nëse ka):** Reference any prior verbal warnings or meetings.

6. **PASOJAT NËSE NUK KORRIGJOHET:** Consequences for continued non‑compliance, up to and including termination of employment.

7. **DISPOZITAT LIGJORE (BAZA LIGJORE):** This section must cite only Kosovo laws provided in the taxonomy above. Use the exact law titles and numbers. For article references:
    - If the taxonomy lists specific articles, cite them exactly (e.g., "Neni [X] i Ligjit Nr. 03/L-212 të Punës").
    - If an article is needed but not listed in the taxonomy, output the placeholder: \`[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]\`.
    - **DO NOT** invent article numbers or use vague phrases like "Neni përkatës".
    - Include a statement: \`Kjo vërejtje bazohet në dispozitat e Ligjit të Punës të Republikës së Kosovës.\`

8. **NËNSHKRIMI:**
    \`\`\`
    Punëdhënësi: ____________________
    (Emri dhe nënshkrimi)
    \`\`\`

IMPORTANT RULES:
- Use uppercase placeholders with underscores: \`[PLACEHOLDER_NAME]\`.
- Never replace a placeholder with invented data.
- Maintain formal tone.
  `,
  placeholder: "Shembull: Punonjësi vazhdimisht vonohet në punë dhe nuk përmbush detyrat.",
  label: "Vërejtje me Shkrim",
};