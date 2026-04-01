// src/drafting/templates/employment/employment_contract.ts
import { TemplateConfig } from '../../types';

export const employmentContractTemplate: TemplateConfig = {
  structureInstructions: `
FORMAT: Professional employment contract (Kontratë Pune) under Kosovo law. Use formal Albanian legal language.

MANDATORY SECTIONS (in order):
1. **HEADER:** \`KONTRATË PUNE\` centered, bold.

2. **DATA DHE PALËT:**
   \`\`\`
   Kontrata lidhet sot, më [DATA E LIDHJES], ndërmjet:
   1. [EMRI I PUNËDHËNËSIT], me adresë [ADRESA], i/e përfaqësuar nga [PËRFAQËSUESI] (në tekstin e mëtejmë "Punëdhënësi"), dhe
   2. [EMRI I PUNËMARRËSIT], me adresë [ADRESA], numri personal [NUMRI I PERSONALITETIT] (në tekstin e mëtejmë "Punëmarrësi").
   \`\`\`

3. **PREAMBULA (DUKE PASUR PARASYSH):** Recitals explaining the need for employment and the legal framework.

4. **OBJEKTI I KONTRATËS:** The position, job description, and place of work. Use placeholders:
   - \`[POZITA: Titulli i vendit të punës]\`
   - \`[PËRSHKRIMI I PUNËS]\`
   - \`[VENDI I PUNËS]\`

5. **DATA E FILLIMIT:** \`[DATA E FILLIMIT]\`

6. **AFATI:** \`[PËR NJË PERIUDHË TË PACAKTUAR / PËR NJË PERIUDHË TË CAKTUAR deri më [DATA MBARIMIT]]\`

7. **ORARI I PUNËS:** \`[NUMRI I ORËVE] orë në javë, nga [ORA FILLIM] deri në [ORA MBARIM]\`

8. **PAGA DHE PËRFITIMET:**
   - Paga mujore: \`[SHUMA NË EURO]\` euro (bruto/neto)
   - Pagesa shtesë (puna jashtë orarit, pushime): \`[KUSHTET]\`

9. **LEJA VJETORE:** \`[NUMRI I DITËVE] ditë pune në vit\`

10. **KUSHTET E PËRFUNDIMIT:** Notice periods, grounds for termination. Reference relevant articles of the Labour Law if applicable.

11. **DISPOZITAT LIGJORE (BAZA LIGJORE):** This section must cite only Kosovo laws provided in the taxonomy above. Use the exact law titles and numbers. For article references:
    - If the taxonomy lists specific articles, cite them exactly (e.g., "Neni [X] i Ligjit Nr. 03/L-212 të Punës").
    - If an article is needed but not listed in the taxonomy, output the placeholder: \`[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]\`.
    - **DO NOT** invent article numbers or use vague phrases like "Neni përkatës".
    - Include a governing law clause: \`Kjo kontratë rregullohet nga ligji i Republikës së Kosovës.\`

12. **ZGJIDHJA E MOSMARRËVESHJEVE:** \`[METODA: negocim / gjykata kompetente në [QYTETI]]\`

13. **NËNSHKRIMET:**
    \`\`\`
    Për Punëdhënësin: ____________________
    (Emri dhe nënshkrimi)
    Për Punëmarrësin: ____________________
    (Emri dhe nënshkrimi)
    \`\`\`

IMPORTANT RULES:
- Use uppercase placeholders with underscores: \`[PLACEHOLDER_NAME]\`.
- Never replace a placeholder with invented data.
- Maintain formal tone.
  `,
  placeholder: "Shembull: Punësoj një punonjës, Blerta Rexhepi, si asistente administrative. Paga mujore 500 euro, fillon më 1 prill.",
  label: "Kontratë Pune",
};