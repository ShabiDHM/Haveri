// src/drafting/templates/real_estate/power_of_attorney.ts
import { TemplateConfig } from '../../types';

export const powerOfAttorneyTemplate: TemplateConfig = {
  structureInstructions: `
FORMAT: Power of attorney (Autorizim / Prokurë) authorizing a person to act on behalf of another under Kosovo law. Use formal Albanian legal language.

MANDATORY SECTIONS (in order):
1. **HEADER:** \`AUTORIZIM / PROKURË\` centered, bold.

2. **DATA DHE PALËT:**
   \`\`\`
   Ky autorizim jepet sot, më [DATA E LËSHIMIT], nga:
   **Autorizuesi:** [EMRI I AUTORIZUESIT], me adresë [ADRESA], numri personal [NUMRI I PERSONALITETIT],
   për të autorizuar:
   **I autorizuari:** [EMRI I TË AUTORIZUARIT], me adresë [ADRESA], numri personal [NUMRI I PERSONALITETIT],
   që të më përfaqësojë dhe të veprojë në emrin tim në çështjet e përshkruara më poshtë.
   \`\`\`

3. **QËLLIMI DHE FUSHËVEPRIMI:** Detailed description of the actions the authorized person may take. Use placeholders for specifics.

4. **AFATI:** \`[DATA FILLIMIT]\` deri më \`[DATA MBARIMIT]\` (ose pa afat, ose deri në revokim).

5. **REVOKIMI:** Statement that the principal may revoke the power of attorney at any time in writing.

6. **FORMALITETET E NOTERIT:** If notarization is required (e.g., for real estate transactions), note: \`Ky autorizim duhet të vërtetohet nga noteri për vlefshmëri ndaj palëve të treta.\`

7. **DISPOZITAT LIGJORE (BAZA LIGJORE):** This section must cite only Kosovo laws provided in the taxonomy above. Use the exact law titles and numbers. For article references:
    - If the taxonomy lists specific articles, cite them exactly (e.g., "Neni [X] i Ligjit Nr. 04/L-077 për Marrëdhëniet e Detyrimeve").
    - If an article is needed but not listed in the taxonomy, output the placeholder: \`[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]\`.
    - **DO NOT** invent article numbers or use vague phrases like "Neni përkatës".
    - Include a governing law clause: \`Ky autorizim rregullohet nga ligji i Republikës së Kosovës.\`

8. **NËNSHKRIMET:**
    \`\`\`
    Autorizuesi: ____________________
    (Emri dhe nënshkrimi)
    I autorizuari: ____________________
    (Emri dhe nënshkrimi)
    \`\`\`

IMPORTANT RULES:
- Use uppercase placeholders with underscores: \`[PLACEHOLDER_NAME]\`.
- Never replace a placeholder with invented data.
- Maintain formal tone.
  `,
  placeholder: "Shembull: Dua të autorizoj avokatin tim për të përfaqësuar mua në shitjen e pronës time.",
  label: "Autorizim / Prokurë",
};