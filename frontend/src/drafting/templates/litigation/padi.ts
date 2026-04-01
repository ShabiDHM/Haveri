// src/drafting/templates/litigation/padi.ts
import { TemplateConfig } from '../../types';

export const padiTemplate: TemplateConfig = {
  structureInstructions: `
FORMAT: Standard Kosovo court pleading (Padisë). Use formal Albanian legal language.

MANDATORY SECTIONS (in order):
1. **GJYKATA THEMELORE NË [QYTETI]** – centered, bold. Replace [QYTETI] with the appropriate city (e.g., Prishtinë, Prizren). If unknown, use [QYTETI].

2. **PALËT:**
   - **Paditësi:** [EMRI I PADITËSIT], [ADRESA E PADITËSIT]
   - **I Padituri:** [EMRI I TË PADITURIT], [ADRESA E TË PADITURIT]

3. **OBJEKTI I PADISË:** [PËRSHKRIM I SHKURTËR I KËRKESËS] – e.g., "Kërkohet vërtetimi i të drejtës së pronësisë", "Kërkohet shpallja e kontratës së pavlefshme", etc.

4. **BAZA LIGJORE:** This section must cite only the Kosovo laws provided in the taxonomy above. Use the exact law titles and numbers. For article references, you must use one of the following:
   - If the taxonomy lists specific articles, cite them exactly (e.g., "Neni 182 i Ligjit për Procedurën Kontestimore (Nr. 03/L-006)").
   - If an article is needed but not listed in the taxonomy, output the placeholder: "[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]".
   - **DO NOT** invent article numbers or use vague phrases like "Neni përkatës".

   Example:
   \`\`\`
   BAZA LIGJORE:
   - Ligji për Procedurën Kontestimore (Nr. 03/L-006), nenet 182, 183, 184.
   \`\`\`

5. **ARSYETIMI:** A reasoned narrative based on the user input. Use placeholders for any missing facts. Structure with numbered paragraphs if needed.

6. **PROVA:** List evidence that supports the claim. Use placeholders for documents or witnesses not specified.

7. **PETITUMI / PËRFUNDIMI:** The specific requests to the court, each numbered. Example:
   - Të vërtetohet se ...;
   - Të detyrohet i padituri të ...;
   - Të ngarkohet i padituri me shpenzimet e procedurës.

8. **NËNSHKRIMI:** 
   \`\`\`
   Data: [DATA E DORËZIMIT]
   Përfaqësuesi i paditësit: [EMRI I AVOKATIT]
   \`\`\`

IMPORTANT RULES:
- Use uppercase placeholders with underscores: \`[PLACEHOLDER_NAME]\`.
- Never replace a placeholder with invented data.
- Do not include commercial agreement sections; this is a court document.
- Keep the tone formal and concise.
  `,
  placeholder: "Shembull: Klienti im, Agim Krasniqi, ka një mosmarrëveshje me fqinjin për kufirin e pronës. Fqinji ka ndërtuar gardh 50 cm në tokën tonë. Dëshiroj të parashtroj një padi për cënim të pronës.",
  label: "Padi",
};