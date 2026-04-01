// src/drafting/templates/corporate/nda.ts
import { TemplateConfig } from '../../types';

export const ndaTemplate: TemplateConfig = {
  structureInstructions: `
FORMAT: Non-Disclosure Agreement (Marrëveshje për Konfidencialitet) under Kosovo law. Use formal Albanian legal language.

MANDATORY SECTIONS (in order):
1. **HEADER:**
   - \`MARRËVESHJE PËR KONFIDENCIALITET\` centered, bold.
   - Placeholder for date: \`[DATA E NËNSHKRIMIT]\`

2. **PALËT:**
   - **Palët nënshkruese:**
     - \`[EMRI I PALËS ZBULUESE]\`, me seli në \`[ADRESA]\`, të përfaqësuar nga \`[PËRFAQËSUESI]\` (në tekstin e mëtejmë "Palë Zbuluese")
     - \`[EMRI I PALËS PRANUESE]\`, me seli në \`[ADRESA]\`, të përfaqësuar nga \`[PËRFAQËSUESI]\` (në tekstin e mëtejmë "Palë Pranuese")

3. **QËLLIMI I MARRËVESHJES:** \`[PËRSHKRIMI I QËLLIMIT TË BASHKËPUNIMIT]\`

4. **PËRKUFIZIMI I INFORMACIONIT KONFIDENCIAL:** All information marked as confidential or reasonably understood to be confidential. Use placeholder for specifics if needed.

5. **OBLIGIMET E PALËS PRANUESE:** 
   - Të mos zbulojë informacionin konfidencial palëve të treta pa pëlqimin e Palës Zbuluese.
   - Të përdorë informacionin konfidencial vetëm për qëllimin e përcaktuar në këtë marrëveshje.
   - Të marrë masa të arsyeshme për të mbrojtur informacionin konfidencial.

6. **PËRJASHTIMET NGA INFORMACIONI KONFIDENCIAL:** Informacioni që është publik, i njohur më parë, ose i zhvilluar në mënyrë të pavarur.

7. **AFATI:** \`[DATA FILLIMIT]\` deri më \`[DATA MBARIMIT]\` (ose periudhë e përcaktuar). Obligimet e konfidencialitetit vazhdojnë edhe pas përfundimit për një periudhë \`[NUMRI I VITEVE]\` vjet.

8. **DISPOZITAT LIGJORE (BAZA LIGJORE):** This section must cite only Kosovo laws provided in the taxonomy above. Use the exact law titles and numbers. For article references:
   - If the taxonomy lists specific articles, cite them exactly (e.g., "Neni [X] i Ligjit për Detyrimet (Kontrata)").
   - If an article is needed but not listed in the taxonomy, output the placeholder: \`[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]\`.
   - **DO NOT** invent article numbers or use vague phrases like "Neni përkatës".
   - Include a governing law clause: \`Kjo marrëveshje rregullohet nga ligji i Republikës së Kosovës.\`

9. **ZGJIDHJA E MOSMARRËVESHJEVE:** \`[METODA: negocim / arbitrazh / gjykata kompetente në [QYTETI]]\`

10. **NËNSHKRIMET:**
    \`\`\`
    Për Palën Zbuluese: ____________________
    (Emri dhe nënshkrimi)
    Për Palën Pranuese: ____________________
    (Emri dhe nënshkrimi)
    \`\`\`

IMPORTANT RULES:
- Use uppercase placeholders with underscores: \`[PLACEHOLDER_NAME]\`.
- Never replace a placeholder with invented data.
- Maintain formal tone.
  `,
  placeholder: "Shembull: Dua të mbroj informacionin tim konfidencial kur diskutoj një partneritet të mundshëm me një kompani tjetër.",
  label: "Marrëveshje Konfidencialiteti (NDA)",
};