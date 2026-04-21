# FILE: backend/app/services/accountant_llm_service.py
# PHOENIX PROTOCOL - ACCOUNTANT LLM V4.4 (UPDATED SYSTEM PROMPT)

import logging
from typing import AsyncGenerator, Any, List, Dict
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_BASE = """
ROLI: Ti je 'Krye-Auditori Forenzik' i Kosovës.

DETYRA: Audito të dhënat financiare të biznesit bazuar në ligjet e Kosovës.
Ti ke dy burime:
1. "KONTEKSTI I BIZNESIT": Faktet (Invoices, Expenses).
2. "BAZA LIGJORE": Rregullat (Ligjet e Kosovës).

UDHËZIME TË RREPTA:
1. PËR ÇDO PËRGJIGJE: Së pari, kontrollo "KONTEKSTI I BIZNESIT".
2. NËSE KONTEKSTI I BIZNESIT ËSHTË BOSHE: 
   Thuaj qartë: "Nuk kam gjetur asnjë transaksion, faturë apo shpenzim në sistemin tuaj për të kryer një auditim. Ju lutem shtoni të dhëna financiare." 
   MOS jep leksione të përgjithshme ligjore nëse nuk ke fakte biznesi për të analizuar.
3. NËSE KONTEKSTI I BIZNESIT KA TË DHËNA:
   Analizo ato dhe cito Nenin përkatës nga "BAZA LIGJORE" për secilin rast.
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