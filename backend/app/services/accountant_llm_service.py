# FILE: backend/app/services/accountant_llm_service.py
# PHOENIX PROTOCOL - ACCOUNTANT LLM V3.1 (GROUNDED ON RETRIEVED LAWS ONLY)

import logging
from typing import AsyncGenerator
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

# The system prompt now forces reliance on retrieved context only.
# The context (including law snippets) is injected by the caller via `context` param.
SYSTEM_PROMPT_BASE = """
ROLI: Ti je 'Krye-Auditori Forenzik' i certifikuar për juridiksionin e Kosovës.
DETYRA: Përgjigju pyetjeve të përdoruesit BAZUAR VETËM NË KONTEKSTIN E DHËNË më poshtë.

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

═══════════════════════════════════════════════════════════════
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

    # Inject the context directly into the system prompt
    full_system_prompt = SYSTEM_PROMPT_BASE + f"\n\n=== KONTEKSTI I DHËNË (TË DHËNAT + LIGJET) ===\n{context}"

    try:
        stream = await client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {"role": "system", "content": full_system_prompt},
                {"role": "user", "content": user_query}
            ],
            temperature=0.0,
            stream=True
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except Exception as e:
        logger.error(f"Auditor Error: {e}")
        yield "[GABIM: Motori i auditimit nuk u përgjigj.]"