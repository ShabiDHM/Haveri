// src/drafting/templates/litigation/ankese.ts
import { TemplateConfig } from '../../types';

export const ankeseTemplate: TemplateConfig = {
  structureInstructions: `
FORMAT: Standard Kosovo court pleading for an appeal (Ankesë). Use formal Albanian legal language.

MANDATORY SECTIONS (in order):
1. **GJYKATA E APELIT E KOSOVËS** (or appropriate appellate court) – centered, bold.  
   If the specific appellate body is unknown, use: \`[GJYKATA E APELIT / DEPARTAMENTI PËRKATËS]\`.

2. **PALËT:**
   - **Ankuesi:** [EMRI I ANKUESIT], [ADRESA E ANKUESIT]
   - **Kundër-ankuesi / Palë tjetër:** [EMRI I PALËS TJETËR], [ADRESA]

3. **VENDIMI I ANKUAR:** Reference the decision being appealed:
   - Gjykata që ka dhënë vendimin: \`[GJYKATA THEMELORE NË QYTETI]\`
   - Numri i lëndës: \`[NR. I LËNDËS]\`
   - Data e vendimit: \`[DATA E VENDIMIT]\`
   - Lloji i vendimit (aktgjykim, vendim, etc.): \`[LLOJI I AKTIT]\`

4. **BAZA LIGJORE:** This section must cite only the Kosovo laws provided in the taxonomy above. Use the exact law titles and numbers. For article references:
   - If the taxonomy lists specific articles, cite them exactly (e.g., "Neni 194 i Ligjit për Procedurën Kontestimore (Nr. 03/L-006)").
   - If an article is needed but not listed in the taxonomy, output the placeholder: \`[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]\`.
   - **DO NOT** invent article numbers or use vague phrases like "Neni përkatës".

5. **ARSYETIMI:** A detailed argument explaining the grounds for appeal. Structure with numbered paragraphs. Include references to errors of law, factual errors, or procedural violations. Use placeholders for any missing facts or evidence.

6. **PROVA:** List evidence that supports the appeal, if any. Use placeholders for documents or witnesses not specified.

7. **KËRKESAT / PËRFUNDIMI:** The specific requests to the appellate court, each numbered. Typical requests may include:
   - Të ndryshohet aktgjykimi i ankuar duke e aprovuar kërkesën e ankuesit;
   - Të prishët aktgjykimi dhe lënda të kthehet në rigjykim;
   - Të detyrohet kundër-ankuesi në shpenzimet e procedurës së ankesës.

8. **NËNSHKRIMI:**
   \`\`\`
   Data: [DATA E DORËZIMIT]
   Përfaqësuesi i ankuesit: [EMRI I AVOKATIT]
   \`\`\`

IMPORTANT RULES:
- Use uppercase placeholders with underscores: \`[PLACEHOLDER_NAME]\`.
- Never replace a placeholder with invented data.
- This is a court document; maintain formal tone and precise language.
- Do not include commercial agreement sections.
  `,
  placeholder: "Shembull: Klienti im ka marrë një vendim të padrejtë nga Gjykata Themelore në Prishtinë dhe dëshiron të apelojë.",
  label: "Ankesë",
};