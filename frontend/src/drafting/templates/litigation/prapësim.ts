// src/drafting/templates/litigation/prapësim.ts
import { TemplateConfig } from '../../types';

export const prapesimTemplate: TemplateConfig = {
  structureInstructions: `
FORMAT: Standard Kosovo court pleading for an objection (Prapësim). Use formal Albanian legal language.

MANDATORY SECTIONS (in order):
1. **GJYKATA THEMELORE NË [QYTETI]** – centered, bold. Replace [QYTETI] with the appropriate city. If unknown, use [QYTETI].

2. **PALËT:**
   - **Paditësi:** [EMRI I PADITËSIT], [ADRESA E PADITËSIT]
   - **I Padituri:** [EMRI I TË PADITURIT], [ADRESA E TË PADITURIT]

3. **OBJEKTI I PRAPËSIMIT:** [PËRSHKRIM I SHKURTËR I ASAJ QË KUNDËRSHTOHET] – e.g., "Prapësim kundër provës së propozuar", "Prapësim ndaj aktit procedural", etc.

4. **BAZA LIGJORE:** This section must cite only the Kosovo laws provided in the taxonomy above. Use the exact law titles and numbers. For article references:
   - If the taxonomy lists specific articles, cite them exactly (e.g., "Neni 182 i Ligjit për Procedurën Kontestimore (Nr. 03/L-006)").
   - If an article is needed but not listed in the taxonomy, output the placeholder: "[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]".
   - **DO NOT** invent article numbers or use vague phrases like "Neni përkatës".

5. **ARSYETIMI:** A reasoned argument explaining why the objection is justified. Structure with numbered paragraphs. Use placeholders for any missing facts or evidence.

6. **KËRKESAT / PËRFUNDIMI:** The specific request to the court, each numbered. Typical requests may include:
   - Të refuzohet provanca e propozuar nga pala kundërshtare;
   - Të shpallet i palejuar akti procedural [PËRSHKRIMI];
   - Të procedohet sipas dispozitave ligjore duke mos marrë parasysh provën/kundërshtimin.

7. **NËNSHKRIMI:**
   \`\`\`
   Data: [DATA E DORËZIMIT]
   Përfaqësuesi i palës: [EMRI I AVOKATIT]
   \`\`\`

IMPORTANT RULES:
- Use uppercase placeholders with underscores: \`[PLACEHOLDER_NAME]\`.
- Never replace a placeholder with invented data.
- This is a court document; maintain formal tone and precise language.
- Do not include commercial agreement sections.
  `,
  placeholder: "Shembull: Dëshiroj të kundërshtoj provën e paraqitur nga pala tjetër për shkak se është e parregullt.",
  label: "Prapësim",
};