// src/drafting/templates/litigation/kunderpadi.ts
import { TemplateConfig } from '../../types';

export const kunderpadiTemplate: TemplateConfig = {
  structureInstructions: `
FORMAT: Standard Kosovo court pleading for a counterclaim (Kundërpadi). Use formal Albanian legal language.

MANDATORY SECTIONS (in order):
1. **GJYKATA THEMELORE NË [QYTETI]** – centered, bold. Replace [QYTETI] with the appropriate city. If unknown, use [QYTETI].

2. **PALËT:**
   - **Paditësi (në padinë kryesore):** [EMRI I PADITËSIT], [ADRESA E PADITËSIT]
   - **I Padituri (në padinë kryesore) / Paditësi në kundërpadi:** [EMRI I TË PADITURIT], [ADRESA E TË PADITURIT]
   - **I Padituri në kundërpadi:** [EMRI I PADITËSIT] (ose sipas rastit)

3. **OBJEKTI I KUNDËRPADISË:** [PËRSHKRIM I SHKURTËR I KËRKESËS SË KUNDËRTPADISË] – e.g., "Kundërpadi për kompensim të dëmit për shkak të padisë së pabazuar".

4. **BAZA LIGJORE:** This section must cite only the Kosovo laws provided in the taxonomy above. Use the exact law titles and numbers. For article references:
   - If the taxonomy lists specific articles, cite them exactly (e.g., "Neni 182 i Ligjit për Procedurën Kontestimore (Nr. 03/L-006)").
   - If an article is needed but not listed in the taxonomy, output the placeholder: "[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]".
   - **DO NOT** invent article numbers or use vague phrases like "Neni përkatës".

5. **ARSYETIMI:** A reasoned argument supporting the counterclaim. Structure with numbered paragraphs. Use placeholders for any missing facts or evidence.

6. **PROVA:** List evidence that supports the counterclaim. Use placeholders for documents or witnesses not specified.

7. **KËRKESAT / PËRFUNDIMI:** The specific requests to the court regarding the counterclaim, each numbered. Typical requests may include:
   - Të obligohet paditësi në padinë kryesore të paguajë [SHUMA] në emër të dëmshpërblimit;
   - Të vërtetohet e drejta e kundërpaditësit në pronën [PËRSHKRIMI];
   - Të shpallet e pavlefshme kontrata [DATA/KONTRAKTA].

8. **NËNSHKRIMI:**
   \`\`\`
   Data: [DATA E DORËZIMIT]
   Përfaqësuesi i kundërpaditësit: [EMRI I AVOKATIT]
   \`\`\`

IMPORTANT RULES:
- Use uppercase placeholders with underscores: \`[PLACEHOLDER_NAME]\`.
- Never replace a placeholder with invented data.
- This document is part of the same lawsuit; reference the original case number if known: \`[NR. I LËNDËS]\`.
- Do not include commercial agreement sections; this is a court document.
- Keep the tone formal and concise.
  `,
  placeholder: "Shembull: Pasi fqinji më paditi për cënim të pronës, unë dua të parashtroj kundërpadi për shpifje dhe ngacmim.",
  label: "Kundërpadi",
};