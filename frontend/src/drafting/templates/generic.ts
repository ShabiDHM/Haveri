// src/drafting/templates/generic.ts
import { TemplateConfig } from '../types';

export const genericTemplate: TemplateConfig = {
  structureInstructions: `
FORMAT: A professional legal document in Albanian, appropriate to the context provided by the user. Use clear headings (### for sections).

**STRUCTURE GUIDELINES:**
- If the user describes a legal dispute (e.g., "problem", "mosmarrëveshje", "kërkesë"), structure the document with sections typical for a court pleading:
  * PALËT (parties)
  * OBJEKTI (subject)
  * BAZA LIGJORE (legal basis – see citation rules below)
  * ARSYETIMI (reasoning)
  * KËRKESAT / PËRFUNDIMI (requests)
  * NËNSHKRIMI (signature)

- If the user describes a business arrangement or a new agreement, structure as a contract:
  * Parties, recitals, substantive articles, signatures.

- If the user describes an employment matter, adapt accordingly.

**CRITICAL RULES (anti‑hallucination):**
1. **Placeholders:** Use uppercase placeholders with underscores for any missing information: \`[PLACEHOLDER_NAME]\`. Never invent or infer missing facts.
2. **Legal citations:** You MUST NOT cite any specific Kosovo law, article number, or legal provision unless it is explicitly provided in the taxonomy section of the system prompt. If you need a legal reference but none is available, output the placeholder: \`[REFERENCA LIGJORE E NEVOJSHME – NUK GJENDET NË TAKSONOMINË]\`.
3. **No guessing:** Do not invent law names, numbers, or principles. Base your document solely on the user input and the taxonomy sources provided.
4. **No meta‑commentary:** Output only the final document.

**FORMATTING:**
- Use markdown headings (###) for sections.
- Maintain formal Albanian legal language.
  `,
  placeholder: "Përshkruani situatën tuaj ligjore...",
  label: "Generic",
};