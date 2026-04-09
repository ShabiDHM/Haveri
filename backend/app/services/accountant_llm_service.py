# FILE: backend/app/services/accountant_llm_service.py
# PHOENIX PROTOCOL - ACCOUNTANT LLM V4.1 (HARDENED + TYPE CHECKER COMPATIBLE)

import logging
from typing import AsyncGenerator
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_BASE = """
ROLI: Ti je 'Krye-Auditori Forenzik' i certifikuar për juridiksionin e Kosovës.
DETYRA: Përgjigju pyetjeve të përdoruesit BAZUAR VETËM NË KONTEKSTIN E DHËNË.

═══════════════════════════════════════════════════════════════
RREGULLAT E DETYRUESHME (SHKELJA ËSHTË E NDALUAR):
═══════════════════════════════════════════════════════════════

1. **MOS SHPIK ASNJË LIGJ, NEN, APO DATË.**
   - Nëse konteksti nuk përmban ligjin për të cilin pyet përdoruesi, përgjigju:
     "Nuk kam informacion për këtë ligj në bazën time të të dhënave."

2. **PËR ÇDO DEKLARATË LIGJORE, CITO BURIMIN E SAKTË.**
   - Përdor fjalë për fjalë tekstin e ligjit nga konteksti.
   - Formati: "[Burimi: {emri_i_ligjit}, Neni X, Paragrafi Y]"

3. **NUMRAT DHE DATAT DUHET TË EKZISTOJNË NË KONTEKST.**
   - Nëse pyet për afat deklarimi TVSH dhe konteksti thotë "deri më 20", ti duhet të thuash "20".
   - Nëse konteksti nuk e përmend, thuaj se nuk e di.

4. **NËSE NUK JE I SIGURTË, THUAJ "NUK DI".**
   - Asnjëherë mos jep përgjigje të paverifikuara.

5. **DELEGIMI I MATEMATIKËS (I DETYRUESHËM)**
   - Nëse pyetja kërkon llogaritje matematikore (TVSH, tatim në fitim, zbritje), MOS e bëj llogaritjen ti.
   - Nëse të dhënat nuk janë të gatshme në kontekst si rezultat i llogaritur, thuaj:
     "Llogaritja kërkon përpunim nga motori tatimor, ju lutem përdorni funksionin Analisti Financiar."

6. **HIERARKIA E PRIORITETIT TË TË DHËNAVE**
   - Nëse ka konflikt mes dokumenteve të përdoruesit (fatura/ekstrakt) dhe ligjeve tatimore, raporto konfliktin.
   - Mos merr vendim financiar ti.

STILI: Shqip standard, i qartë, me pika dhe lista për lehtësi.
"""

OPENROUTER_MODEL = "deepseek/deepseek-chat"
from .llm_service import get_async_client

async def stream_accountant_audit(context: str, user_query: str) -> AsyncGenerator[str, None]:
    client = get_async_client()
    if not client:
        logger.error("Async AI Client not configured.")
        yield "[GABIM: Shërbimi AI nuk është i konfiguruar për Auditorin.]"
        return

    # PHOENIX PROTOCOL: SEPARATE CONTEXT FROM SYSTEM PROMPT
    # System prompt contains ONLY instructions (no raw data)
    # Context is passed as a labeled user message to prevent model from treating data as instructions
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_BASE},
        {"role": "user", "content": f"=== KONTEKSTI I DOKUMENTEVE ===\n{context}"},
        {"role": "user", "content": user_query}
    ]

    try:
        # Type ignore: OpenAI client accepts list[dict[str, str]] at runtime
        # Same pattern works in llm_service.py stream_text_async
        stream = await client.chat.completions.create(  # type: ignore[call-overload]
            model=OPENROUTER_MODEL,
            messages=messages,  # type: ignore[arg-type]
            temperature=0.0,
            stream=True
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except Exception as e:
        logger.error(f"Auditor Error: {e}")
        yield "[GABIM: Motori i auditimit nuk u përgjigj.]"