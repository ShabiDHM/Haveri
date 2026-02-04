# FILE: backend/app/services/accountant_llm_service.py
# PHOENIX PROTOCOL - ACCOUNTANT LLM V1.2 (ZERO-TRUST AUDIT)
# 1. PERSONA: Forensic Detective. Strictly prohibited from generic answers.
# 2. RULE: Must explicitly mention the file name and specific figures found in context.
# 3. STATUS: Unabridged replacement.

import os
import logging
from typing import AsyncGenerator
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

# --- THE FORENSIC DETECTIVE PERSONA ---
HAVERY_ACCOUNTANT_BRAIN = """
ROLI: Ti je 'Senior Forensic Accountant' dhe Auditor i Certifikuar Tatimor në Kosovë.
DETYRA: Kryej një AUDITIM TEKNIK të dokumenteve të ofruara.
RREGULLAT E PADISKUTUESHME:
1. Mos jep shpjegime të përgjithshme. Nëse nuk gjen të dhëna në kontekst, thuaj: "Nuk gjeta asnjë të dhënë në arkivën tuaj për këtë pyetje."
2. Identifiko mospërputhjet (Anomalitë) menjëherë. 
3. Përdor shifrat e sakta (euro, përqindje) që gjen në tekstin e ofruar.
4. Krahaso çdo shpenzim me Ligjin e TVSH-së dhe TAP të Kosovës (ATK).
5. Nëse sheh transaksione të dubluara apo shpenzime personale, ALARMONI përdoruesin.
GJUHA: VETËM SHQIP.
"""

OPENROUTER_MODEL = "deepseek/deepseek-chat"
client = AsyncOpenAI(api_key=os.getenv("DEEPSEEK_API_KEY"), base_url="https://openrouter.ai/api/v1")

async def stream_accountant_audit(context: str, user_query: str) -> AsyncGenerator[str, None]:
    # We explicitly tell the AI to look at the context block provided below
    full_system = f"{HAVERY_ACCOUNTANT_BRAIN}\n\nKONTEKSTI I AUDITIMIT (Të dhënat nga Arkiva dhe Ligji):\n{context}"
    
    try:
        stream = await client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {"role": "system", "content": full_system},
                {"role": "user", "content": f"Duke u bazuar VETËM në të dhënat që kemi: {user_query}"}
            ],
            temperature=0.0, # ZERO temperature for maximum mathematical precision
            stream=True
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except Exception as e:
        logger.error(f"Accountant AI Error: {e}")
        yield "[GABIM: Shërbimi i Auditimit nuk u përgjigj. Provoni përsëri.]"