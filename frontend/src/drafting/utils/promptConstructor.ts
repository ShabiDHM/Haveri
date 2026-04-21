// FILE: src/drafting/utils/promptConstructor.ts
// PHOENIX PROTOCOL - DUAL-LAYER SMART PROMPT (LEGAL CONTEXT + TEMPLATE)

import { TemplateType } from '../types';
import { getDocumentStructureInstructions } from './templateHelpers';

export const constructSmartPrompt = (userText: string, template: TemplateType, legalContext?: string): string => {
  // NOTE: The conflicting LEGAL_WHITELIST has been intentionally removed from here.
  // The strict Kosovo statute mapping and System Directives are now securely handled 
  // by the Zero-Hallucination Protocol in DraftingPage.tsx.

  // Prepare legal context block with clear precedence rules
  const legalContextBlock = legalContext
    ? `
[BAZA LIGJORE E APLIKUAR (KOSOVË)]
${legalContext}

[UDHËZIME PËR PËRPARËSINË LIGJORE]
1. Përdor BAZËN LIGJORE më sipër për të përcaktuar klauzolat e detyrueshme dhe kushtet ligjore.
2. Përdor STRUKTURËN E TEMPLATE-it më poshtë për formatin dhe stilin e paraqitjes.
3. **RREGULLA THEMELORE**: Nëse ndonjë dispozitë e TEMPLATE-it bie ndesh me BAZËN LIGJORE, LIGJI KA PËRPARËSI.
   - Anulo pjesën kontradiktore të TEMPLATE-it dhe zëvendësoje me atë që kërkon ligji.
   - Trego qartë në dokument se ke bërë këtë përshtatje ligjore.
   - Mos shto kurrë klauzola që janë të ndaluara me ligj.
`
    : `
[BAZA LIGJORE E APLIKUAR]
Nuk është ofruar kontekst ligjor shtesë. Përdor strukturën e template-it pa ndërhyrje ligjore.
`;

  return `
${legalContextBlock}

[FAKTET DHE KËRKESA E KLIENTIT]
Të dhënat e ofruara nga përdoruesi për këtë rast:
"""
${userText}
"""

[UDHËZIME SHTESË PËR KËTË DRAFT]
1. Ndërto dokumentin duke u bazuar KREJTËSISHT te faktet e mësipërme.
2. Për çdo të dhënë që klienti nuk e ka ofruar në tekstin e mësipërm, NDALOHET përdorimi i vijave të zbrazëta (si p.sh. "_____").
3. TI DUHET të përdorësh emërtime të qarta brenda kllapave katrore për të dhënat që mungojnë. 
   Shembuj të saktë: [NUMRI_PERSONAL_I_PADITËSIT], [DATA_E_LIDHJES_SË_KONTRATËS], [SHUMA_E_DETYRIMIT], [ADRESA_E_TË_PADITURIT].

[STRUKTURA SPECIFIKE E DOKUMENTIT TË ZGJEDHUR]
${getDocumentStructureInstructions(template)}
  `.trim();
};