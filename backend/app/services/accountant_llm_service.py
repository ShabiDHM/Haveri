# FILE: backend/app/services/accountant_llm_service.py
# PHOENIX PROTOCOL - ACCOUNTANT LLM V4.3 (TYPE-SAFETY PATCH)

import logging
from typing import AsyncGenerator, Any, List, Dict
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_BASE = """
ROLI: Ti je 'Krye-Auditori Forenzik' i certifikuar për juridiksionin e Kosovës.

DETYRA: Analizo të dhënat e biznesit duke aplikuar rregullat ligjore të Kosovës.
Ti ke dy burime të dhënash në kontekst:
1. "KONTEKSTI I BIZNESIT" (Faturat, Shpenzimet, Transaksionet, Dokumentet Private).
2. "BAZA LIGJORE" (Ligjet dhe Rregulloret e Kosovës).

═══════════════════════════════════════════════════════════════
RREGULLAT E DETYRUESHME (SHKELJA ËSHTË E NDALUAR):
═══════════════════════════════════════════════════════════════

1. **INTEGRIMI I TË DHËNAVE:** 
   Përdor "BAZA LIGJORE" për të interpretuar "KONTEKSTI I BIZNESIT". Nëse klienti pyet për TVSH, gjej normën në BAZA LIGJORE dhe aplikoje tek Faturat në KONTEKSTI I BIZNESIT.

2. **CITIMI:**
   Për çdo pohim ligjor, duhet të citosh: "[Burimi: {emri_i_ligjit}, Neni X]".

3. **VERIFIKIMI:**
   Nëse KONTEKSTI I BIZNESIT tregon një veprim që bie ndesh me BAZA LIGJORE, raportoje si "Rrezik Pajtueshmërie".

4. **DELEGIMI I MATEMATIKËS:**
   Nëse pyetja kërkon llogaritje të detajuara, mos i bëj vetë nëse nuk je 100% i sigurt. Thuaj: "Llogaritja kërkon përpunim nga motori tatimor."

5. **NUK DI:**
   Nëse informacioni nuk gjendet në asnjërin prej blloqeve, thuaj: "Nuk kam informacion të mjaftueshëm për këtë kërkesë."

STILI: Shqip standard, profesionist, auditues.
"""

from .llm_service import get_async_client
OPENROUTER_MODEL = "deepseek/deepseek-chat"

async def stream_accountant_audit(context: str, user_query: str) -> AsyncGenerator[str, None]:
    client = get_async_client()
    if not client:
        logger.error("Async AI Client not configured.")
        yield "[GABIM: Shërbimi AI nuk është i konfiguruar.]"
        return

    # Use explicit casting to 'Any' to resolve Pylance 'reportArgumentType' issue
    # The OpenAI SDK handles dictionary structures at runtime despite strict typing
    messages: List[Dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT_BASE},
        {"role": "user", "content": f"=== TË DHËNAT PËR ANALIZË ===\n{context}"},
        {"role": "user", "content": f"=== PYETJA E PËRDORUESIT ===\n{user_query}"}
    ]

    try:
        # Cast messages to 'Any' to bypass strict Pylance/OpenAI type checks
        stream = await client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=cast(Any, messages), 
            temperature=0.0,
            stream=True
        )
        async for chunk in stream:
            if hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except Exception as e:
        logger.error(f"Auditor Error: {e}")
        yield "[GABIM: Motori i auditimit nuk u përgjigj.]"

# Helper for type safety
def cast(type_obj: Any, val: Any) -> Any:
    return val