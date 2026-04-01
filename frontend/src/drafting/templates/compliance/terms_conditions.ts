// src/drafting/templates/compliance/terms_conditions.ts
import { TemplateConfig } from '../../types';

export const termsConditionsTemplate: TemplateConfig = {
  structureInstructions: `
FORMAT: Terms and Conditions (Kushtet e Përdorimit) for a website, application, or service under Kosovo law. Use formal Albanian legal language.

MANDATORY SECTIONS (in order):
1. **HEADER:** \`KUSHTET E PËRDORIMIT\` centered, bold.

2. **DATA E FUQIZIMIT:** \`[DATA E FUQIZIMIT]\`

3. **PRANIMI I KUSHTEVE:** Explanation that using the service constitutes acceptance of these terms.

4. **PALËT:** Identification of the service provider and user.

5. **LLOGARITË E PËRDORUESVE:** Rules for account creation, security, and termination.

6. **PAGESAT (nëse aplikohet):** Payment terms, pricing, refunds. Use placeholders for specifics.

7. **PRONËSIA INTELEKTUALE:** Ownership of content, trademarks, user‑generated content licenses.

8. **PËRDORIMI I LEJUAR DHE I NDALUAR:** Acceptable use policy, prohibited activities.

9. **KUFIZIMI I PËRGJEGJËSISË:** Disclaimers, limitation of liability.

10. **PËRFUNDIMI I LLOGARISË:** Grounds for termination by either party.

11. **DISPOZITAT LIGJORE (BAZA LIGJORE):** This section must cite only Kosovo laws provided in the taxonomy above. Use the exact law titles and numbers. For article references:
    - If the taxonomy lists specific articles, cite them exactly (e.g., "Neni [X] i Ligjit për Mbrojtjen e Konsumatorit (Nr. 04/L-121)").
    - If an article is needed but not listed in the taxonomy, output the placeholder: \`[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]\`.
    - **DO NOT** invent article numbers or use vague phrases like "Neni përkatës".
    - Include a governing law clause: \`Këto kushte rregullohen nga ligji i Republikës së Kosovës.\`

12. **ZGJIDHJA E MOSMARRËVESHJEVE:** \`[METODA: negocim / arbitrazh / gjykata kompetente në [QYTETI]]\`

13. **KONTAKTI:** 
    \`\`\`
    Për pyetje në lidhje me këto kushte, na kontaktoni në: [EMAIL]
    \`\`\`

IMPORTANT RULES:
- Use uppercase placeholders with underscores: \`[PLACEHOLDER_NAME]\`.
- Never replace a placeholder with invented data.
- Maintain formal tone.
  `,
  placeholder: "Shembull: Faqja ime e internetit shet produkte online dhe kam nevojë për kushtet e përdorimit.",
  label: "Kushtet e Përdorimit",
};