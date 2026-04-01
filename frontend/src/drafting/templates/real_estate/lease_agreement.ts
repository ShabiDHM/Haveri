// src/drafting/templates/real_estate/lease_agreement.ts
import { TemplateConfig } from '../../types';

export const leaseAgreementTemplate: TemplateConfig = {
  structureInstructions: `
FORMAT: Residential or commercial lease agreement (Kontratë Qiraje) under Kosovo law. Use formal Albanian legal language.

MANDATORY SECTIONS (in order):
1. **HEADER:** \`KONTRATË QIRAJEPËR [PËRDORIM BANESOR / AFARIST]\` centered, bold.

2. **DATA DHE PALËT:**
   \`\`\`
   Kontrata lidhet sot, më [DATA E LIDHJES], ndërmjet:
   1. [EMRI I QIRADHËNËSIT], me adresë [ADRESA], numri personal [NUMRI I PERSONALITETIT] (në tekstin e mëtejmë "Qiradhënësi"), dhe
   2. [EMRI I QIRAMARRËSIT], me adresë [ADRESA], numri personal [NUMRI I PERSONALITETIT] (në tekstin e mëtejmë "Qirapërfituesi").
   \`\`\`

3. **PËRSHKRIMI I PRONËS:** 
   - Adresa e plotë: \`[ADRESA E PRONËS]\`
   - Përshkrimi fizik: \`[PËRSHKRIMI, sipërfaqja, numri i dhomave, etj.]\`
   - Numri kadastral (nëse ekziston): \`[NUMRI KADASTRAL]\`

4. **QËLLIMI:** \`[PËRDORIM BANESOR / AFARIST / TIETËR]\`

5. **AFATI:** \`[DATA FILLIMIT]\` deri më \`[DATA MBARIMIT]\` (ose pa afat). Periudha e njoftimit për shkëputje: \`[PERIUDHA]\`.

6. **QIRAJA DHE PAGESA:**
   - Shuma mujore: \`[SHUMA NË EURO]\` euro
   - Dita e pagesës: çdo datë \`[DATA]\` të muajit
   - Mënyra e pagesës: \`[PARA / TRANSFERË BANKE]\`

7. **DEPOZITA:** \`[SHUMA NË EURO]\` euro (zakonisht një qira), e cila kthehet pas lirimit të pronës në gjendje të mirë.

8. **SHPENZIMET:** Shpërndarja e shpenzimeve (rryma, uji, ngrohja, pastrimi, administrimi). Përdorni vendmbajtëse sipas rastit.

9. **OBLIGIMET E QIRADHËNËSIT:** Dorëzimi i pronës në gjendje funksionale, mirëmbajtja e pjesëve strukturore.

10. **OBLIGIMET E QIRAPËRFITUESIT:** Përdorimi i pronës sipas qëllimit, pagesa e qirasë në kohë, kujdesi për pronën.

11. **DISPOZITAT LIGJORE (BAZA LIGJORE):** This section must cite only Kosovo laws provided in the taxonomy above. Use the exact law titles and numbers. For article references:
    - If the taxonomy lists specific articles, cite them exactly (e.g., "Neni [X] i Ligjit Nr. 04/L-077 për Marrëdhëniet e Detyrimeve").
    - If an article is needed but not listed in the taxonomy, output the placeholder: \`[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]\`.
    - **DO NOT** invent article numbers or use vague phrases like "Neni përkatës".
    - Include a governing law clause: \`Kjo kontratë rregullohet nga ligji i Republikës së Kosovës.\`

12. **ZGJIDHJA E MOSMARRËVESHJEVE:** \`[METODA: negocim / gjykata kompetente në [QYTETI]]\`

13. **NËNSHKRIMET:**
    \`\`\`
    Qiradhënësi: ____________________
    (Emri dhe nënshkrimi)
    Qirapërfituesi: ____________________
    (Emri dhe nënshkrimi)
    \`\`\`

IMPORTANT RULES:
- Use uppercase placeholders with underscores: \`[PLACEHOLDER_NAME]\`.
- Never replace a placeholder with invented data.
- Maintain formal tone.
  `,
  placeholder: "Shembull: Marr me qira një banesë në Prishtinë, te rruga 'Bill Clinton'. Qiradhënësi: Ilir Shala. Qiraja mujore 300 euro.",
  label: "Kontratë Qiraje",
};