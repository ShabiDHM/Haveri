// src/drafting/templates/real_estate/sales_purchase.ts
import { TemplateConfig } from '../../types';

export const salesPurchaseTemplate: TemplateConfig = {
  structureInstructions: `
FORMAT: Sale and purchase agreement (Kontratë Shitblerje) for immovable property under Kosovo law. Use formal Albanian legal language.

MANDATORY SECTIONS (in order):
1. **HEADER:** \`KONTRATË SHITBLERJE PËR PRONË TË PALUAJTSHME\` centered, bold.

2. **DATA DHE PALËT:**
   \`\`\`
   Kontrata lidhet sot, më [DATA E LIDHJES], ndërmjet:
   1. **Shitësi:** [EMRI I SHITËSIT], me adresë [ADRESA], numri personal [NUMRI I PERSONALITETIT] (në tekstin e mëtejmë "Shitësi"), dhe
   2. **Blerësi:** [EMRI I BLERËSIT], me adresë [ADRESA], numri personal [NUMRI I PERSONALITETIT] (në tekstin e mëtejmë "Blerësi").
   \`\`\`

3. **PËRSHKRIMI I PRONËS:**
   - Adresa e plotë: \`[ADRESA E PRONËS]\`
   - Përshkrimi fizik: \`[PËRSHKRIMI, sipërfaqja, kufijtë, etj.]\`
   - Numri kadastral: \`[NUMRI KADASTRAL]\`
   - Zona kadastrale: \`[ZONA KADASTRALE]\`

4. **ÇMIMI DHE PAGESA:**
   - Çmimi total: \`[SHUMA NË EURO]\` euro
   - Mënyra e pagesës: \`[PARA / TRANSFERË BANKE / KËSTET]\`
   - Afati i pagesës: \`[DATA E PAGESËS]\`

5. **DORËZIMI I PRONËS:** Data e dorëzimit: \`[DATA E DORËZIMIT]\`. Gjendja në të cilën dorëzohet prona.

6. **KALIMI I PRONËSISË:** The transfer of ownership takes effect with the signing of this contract and is subject to registration in the cadaster. Notarization is required.

7. **DEKLARIMET DHE GARANCITË E SHITËSIT:** 
   - Shitësi është pronar i vetëm dhe prona është e lirë nga barrët.
   - Nëse ekzistojnë barrë, përdorni vendmbajtëse: \`[PËRSHKRIMI I BARRËVE]\`.

8. **SHPENZIMET:** Shpenzimet e noterit, taksat, dhe regjistrimi në kadastër paguhen nga: \`[PALA]\`.

9. **DISPOZITAT LIGJORE (BAZA LIGJORE):** This section must cite only Kosovo laws provided in the taxonomy above. Use the exact law titles and numbers. For article references:
    - If the taxonomy lists specific articles, cite them exactly (e.g., "Neni [X] i Ligjit Nr. 03/L-154 për Pronësinë dhe të Drejtat Tjera Sendore").
    - If an article is needed but not listed in the taxonomy, output the placeholder: \`[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]\`.
    - **DO NOT** invent article numbers or use vague phrases like "Neni përkatës".
    - Include a governing law clause: \`Kjo kontratë rregullohet nga ligji i Republikës së Kosovës.\`

10. **ZGJIDHJA E MOSMARRËVESHJEVE:** \`[METODA: negocim / gjykata kompetente në [QYTETI]]\`

11. **NËNSHKRIMET:**
    \`\`\`
    Shitësi: ____________________
    (Emri dhe nënshkrimi)
    Blerësi: ____________________
    (Emri dhe nënshkrimi)
    \`\`\`

IMPORTANT RULES:
- Use uppercase placeholders with underscores: \`[PLACEHOLDER_NAME]\`.
- Never replace a placeholder with invented data.
- Maintain formal tone.
  `,
  placeholder: "Shembull: Dua të shes një shtëpi në Prishtinë për 100,000 euro. Blerësi është Agim Krasniqi.",
  label: "Kontratë Shitblerje",
};