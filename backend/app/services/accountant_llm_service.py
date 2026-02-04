# FILE: backend/app/services/accountant_llm_service.py
# PHOENIX PROTOCOL - ACCOUNTANT LLM V1.1 (HAVERY PERSONA)
# 1. PERSONA: Senior Forensic Accountant (Kosovo Jurisdiction).
# 2. LOGIC: High-precision number analysis (Temp 0.1).

import os
import logging
from typing import AsyncGenerator
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

# --- THE FORENSIC PERSONA ---
HAVERY_ACCOUNTANT_BRAIN = """
ROLI: Ti je 'Senior Forensic Accountant' dhe Auditor i Certifikuar Tatimor në Kosovë.
DETYRA: Analizo faturat dhe transaksionet e përdoruesit duke i krahasuar ato me Ligjet e Kosovës (TVSH, TAP, dhe rregulloret e ATK).
UDHËZIME: 
1. Gjej mospërputhje mes shifrave dhe rregullave tatimore.
2. Identifiko nëse një shpenzim është i zbritshëm (deductible).
3. Ji i saktë, i ftohtë, dhe profesional.
GJUHA: VETËM SHQIP.
"""

OPENROUTER_MODEL = "deepseek/deepseek-chat"
client = AsyncOpenAI(api_key=os.getenv("DEEPSEEK_API_KEY"), base_url="https://openrouter.ai/api/v1")

async def stream_accountant_audit(context: str, user_query: str) -> AsyncGenerator[str, None]:
    full_system = f"{HAVERY_ACCOUNTANT_BRAIN}\n\nKONTEKSTI AKTUAL:\n{context}"
    try:
        stream = await client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {"role": "system", "content": full_system},
                {"role": "user", "content": user_query}
            ],
            temperature=0.1, 
            stream=True
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except Exception as e:
        logger.error(f"Accountant AI Error: {e}")
        yield "[GABIM: Shërbimi i Kontabilitetit nuk u përgjigj.]"