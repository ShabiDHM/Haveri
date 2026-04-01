// src/drafting/templates/compliance/privacy_policy.ts
import { TemplateConfig } from '../../types';

export const privacyPolicyTemplate: TemplateConfig = {
  structureInstructions: `
FORMAT: Privacy Policy (Politika e Privatësisë) for a website, application, or service under Kosovo law. Use formal Albanian legal language.

MANDATORY SECTIONS (in order):
1. **HEADER:** \`POLITIKA E PRIVATËSISË\` centered, bold.

2. **DATA E FUQIZIMIT:** \`[DATA E FUQIZIMIT]\`

3. **HYRJE:** Introduction explaining the purpose of the policy and the identity of the data controller.

4. **KONTROLLUESI I TË DHËNAVE:** 
   \`\`\`
   Emri i kontrolluesit: [EMRI I KOMPANISË / PERSONIT]
   Adresa: [ADRESA]
   Kontakt: [EMAIL, TELEFONI]
   \`\`\`

5. **LLOJET E TË DHËNAVE TË MBLEDHURA:** Categories of personal data collected, e.g.,:
   - Të dhënat identifikuese: [EMRI, MBIEMRI, ADRESA, etc.]
   - Të dhënat e kontaktit: [EMAIL, TELEFONI]
   - Të dhënat e përdorimit: [IP ADRESA, COOKIES, etc.]

6. **BAZA LIGJORE PËR PËRPUNIM:** This section must cite the Kosovo Law on Personal Data Protection (Ligji Nr. 06/L-082). Use exact law title and number. For article references:
   - If the taxonomy lists specific articles, cite them exactly (e.g., "Neni [X] i Ligjit Nr. 06/L-082 për Mbrojtjen e të Dhënave Personale").
   - If an article is needed but not listed, output the placeholder: \`[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]\`.
   - **DO NOT** invent article numbers.

7. **QËLLIMET E PËRPUNIMIT:** List purposes (e.g., përmbushja e kontratës, interes legjitim, pëlqim).

8. **KOHËZGJATJA E RUJTJES:** \`[PERIUDHA] ose deri në tërheqjen e pëlqimit\`.

9. **NDARJA ME PALËT E TRETA:** Conditions and recipients of data sharing. Use placeholders for third parties.

10. **TË DREJTAT E PËRDORUESVE:** List of rights under Kosovo law: e drejta e qasjes, korrigjimit, fshirjes ("të harrohet"), kufizimit të përpunimit, portabilitetit, kundërshtimit, tërheqjes së pëlqimit.

11. **MASAT E SIGURISË:** General description of security measures (e.g., masat teknike dhe organizative).

12. **NDRYSHIMET NË POLITIKË:** How users will be informed of changes.

13. **KONTAKTI PËR ÇËSHTJE TË MBROJTJES SË TË DHËNAVE:**
    \`\`\`
    Për pyetje ose ushtrim të të drejtave, kontaktoni: [EMAIL I PËRGJEGJËSIT]
    \`\`\`

IMPORTANT RULES:
- Use uppercase placeholders with underscores: \`[PLACEHOLDER_NAME]\`.
- Never replace a placeholder with invented data.
- Maintain formal tone.
  `,
  placeholder: "Shembull: Krijo një politikë privatësie për faqen time të internetit që shet produkte.",
  label: "Politika e Privatësisë",
};