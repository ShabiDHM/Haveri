// src/drafting/templates/corporate/sla.ts
import { TemplateConfig } from '../../types';

export const slaTemplate: TemplateConfig = {
  structureInstructions: `
FORMAT: Service Level Agreement (Marrëveshje e Nivelit të Shërbimit) under Kosovo law. Use formal Albanian legal language.

MANDATORY SECTIONS (in order):
1. **HEADER:** \`MARRËVESHJE E NIVELIT TË SHËRBIMIT\` centered, bold.

2. **DATE AND PARTIES:**
   \`\`\`
   Kjo marrëveshje lidhet sot, më [DATA E LIDHJES], ndërmjet:
   1. [EMRI I OFRUESIT TË SHËRBIMIT], me adresë [ADRESA], i/e përfaqësuar nga [PËRFAQËSUESI] (në tekstin e mëtejmë "Ofruesi"), dhe
   2. [EMRI I KLIENTIT], me adresë [ADRESA], i/e përfaqësuar nga [PËRFAQËSUESI] (në tekstin e mëtejmë "Klienti").
   \`\`\`

3. **PREAMBULA (DUKE PASUR PARASYSH):** Recitals explaining the context and objectives of the agreement.

4. **QËLLIMI DHE FUSHËVEPRIMI:** \`[PËRSHKRIM I PËRGJITHSHËM I SHËRBIMEVE]\`

5. **SHËRBIMET E OFRUARA:** Detailed list of services. Use placeholders for specifics.

6. **METRIKAT E PERFORMANCËS DHE NIVELET E SHËRBIMIT:** Key performance indicators (KPIs), e.g.,:
   - \`[Koha e përgjigjes: [PERIUDHA]\`
   - \`[Koha e zgjidhjes: [PERIUDHA]\`
   - \`[Disponueshmëria: [PËRQINDJA]%]\`

7. **PËRGJEGJËSITË E PALËVE:**
   - **Ofruesi:** \`[PËRSHKRIM]\`
   - **Klienti:** \`[PËRSHKRIM]\`

8. **SANKSIONET PËR MOSARRITJEN E NIVELIT:** Remedies if service levels are not met, e.g.,:
   - \`[Kreditë e shërbimit]\`
   - \`[Gjobat]\`

9. **AFATI DHE PËRFUNDIMI:** \`[DATA FILLIMIT]\` deri më \`[DATA MBARIMIT]\` (ose pa afat). Kushtet për përfundim.

10. **DISPOZITAT LIGJORE (BAZA LIGJORE):** This section must cite only Kosovo laws provided in the taxonomy above. Use the exact law titles and numbers. For article references:
    - If the taxonomy lists specific articles, cite them exactly (e.g., "Neni [X] i Ligjit për Detyrimet (Kontrata)").
    - If an article is needed but not listed in the taxonomy, output the placeholder: \`[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]\`.
    - **DO NOT** invent article numbers or use vague phrases like "Neni përkatës".
    - Include a governing law clause: \`Kjo marrëveshje rregullohet nga ligji i Republikës së Kosovës.\`

11. **ZGJIDHJA E MOSMARRËVESHJEVE:** \`[METODA: negocim / arbitrazh / gjykata kompetente në [QYTETI]]\`

12. **NËNSHKRIMET:**
    \`\`\`
    Për Ofruesin: ____________________
    (Emri dhe nënshkrimi)
    Për Klientin: ____________________
    (Emri dhe nënshkrimi)
    \`\`\`

IMPORTANT RULES:
- Use uppercase placeholders with underscores: \`[PLACEHOLDER_NAME]\`.
- Never replace a placeholder with invented data.
- Maintain formal tone.
  `,
  placeholder: "Shembull: Një kompani IT do të ofrojë shërbime të mirëmbajtjes për klientin, me kohë përgjigjeje dhe sanksione.",
  label: "Marrëveshje e Nivelit të Shërbimit (SLA)",
};