// src/drafting/templates/litigation/pergjigje.ts
import { TemplateConfig } from '../../types';

export const pergjigjeTemplate: TemplateConfig = {
  structureInstructions: `
FORMAT: Standard Kosovo court pleading for a response (Përgjigje në Padi). Use formal Albanian legal language.

MANDATORY SECTIONS (in order):
1. **GJYKATA THEMELORE NË [QYTETI]** – centered, bold. Replace [QYTETI] with the appropriate city. If unknown, use [QYTETI].

2. **PALËT:**
   - **Paditësi:** [EMRI I PADITËSIT], [ADRESA E PADITËSIT]
   - **I Padituri:** [EMRI I TË PADITURIT], [ADRESA E TË PADITURIT]

3. **OBJEKTI:** [PËRSHKRIM I SHKURTËR I PADISË] – e.g., "Përgjigje në padinë e depozituar me nr. [NR. I LËNDËS]".

4. **BAZA LIGJORE:** This section must cite only the Kosovo laws provided in the taxonomy above. Use the exact law titles and numbers. For article references:
   - If the taxonomy lists specific articles, cite them exactly (e.g., "Neni 182 i Ligjit për Procedurën Kontestimore (Nr. 03/L-006)").
   - If an article is needed but not listed in the taxonomy, output the placeholder: "[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]".
   - **DO NOT** invent article numbers or use vague phrases like "Neni përkatës".

5. **ARSYETIMI:** A reasoned argument against the plaintiff's claim. Structure with numbered paragraphs. Use placeholders for any missing facts or evidence.

6. **PROVA:** List evidence that supports the defense. Use placeholders for documents or witnesses not specified.

7. **KËRKESAT / PËRFUNDIMI:** The specific requests to the court, each numbered. Typical requests may include:
   - Të rrëzohet në tërësi padi e paditësit si e pabazuar;
   - Të detyrohet paditësi të dëshmojë pretendimet e tij;
   - Të ngarkohet paditësi me shpenzimet e procedurës.

8. **NËNSHKRIMI:**
   \`\`\`
   Data: [DATA E DORËZIMIT]
   Përfaqësuesi i të paditurit: [EMRI I AVOKATIT]
   \`\`\`

IMPORTANT RULES:
- Use uppercase placeholders with underscores: \`[PLACEHOLDER_NAME]\`.
- Never replace a placeholder with invented data.
- Do not include commercial agreement sections; this is a court document.
- Keep the tone formal and concise.
  `,
  placeholder: "Shembull: Klienti im, Agim Krasniqi, është paditur nga fqinji për cënim të pronës. Ne pretendojmë se gardhi është në tokën tonë dhe kërkojmë rrëzimin e padisë.",
  label: "Përgjigje në Padi",
};