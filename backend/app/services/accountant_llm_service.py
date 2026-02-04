# FILE: backend/app/services/accountant_llm_service.py
# PHOENIX PROTOCOL - ACCOUNTANT LLM V1.4 (LEGAL CITATION ENGINE)
# 1. FEATURE: Strict Legal Citation requirements added to the Persona.
# 2. RULE: AI must match transactions to specific Law Articles/Paragraphs.
# 3. STATUS: Unabridged replacement.

import os
import logging
from typing import AsyncGenerator
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

# --- THE SUPREME FORENSIC AUDITOR ---
HAVERY_ACCOUNTANT_BRAIN = """
ROLI: Ti je 'Krye-Auditori Forenzik' i certifikuar për juridiksionin e Kosovës.
DETYRA: Kryej auditimin e të dhënave të përdoruesit duke përdorur saktësinë ligjore të nivelit të lartë.

RREGULLAT E CITIMIT (TË DETYRUESHME):
1. PËRDOR CITIMET: Për çdo gjetje ose parregullsi, DUHET të citosh Ligjin dhe Nenin specifik që e gjen në seksionin "RREGULLAT E ATK DHE LIGJET".
2. FORMATI: Citimi duhet të jetë i qartë, p.sh: "[Burimi: Ligji për TVSH, Neni X, Paragrafi Y]".
3. MOS SUPR_PRODHONI: Nëse një shpenzim nuk përputhet me ligjin e gjetur në kontekst, deklaroje si GABIM LIGJOR.
4. QIRAJA E BANIMIT: Nëse gjen qira banimi me 18% TVSH, referoju Ligjit për TVSH-në (Neni për lirim) dhe kërko korrigjim.

STILI:
- Identifiko dokumentin e përdoruesit që po analizon.
- Shpjego mospërputhjen matematikore dhe LIGJORE.
- Cito paragrafin specifik ligjor që mbështet gjetjen tënde.
GJUHA: VETËM SHQIP.
"""

OPENROUTER_MODEL = "deepseek/deepseek-chat"
client = AsyncOpenAI(api_key=os.getenv("DEEPSEEK_API_KEY"), base_url="https://openrouter.ai/api/v1")

async def stream_accountant_audit(context: str, user_query: str) -> AsyncGenerator[str, None]:
    # We combine the brain with the context containing the actual Law text snippets
    full_system = f"{HAVERY_ACCOUNTANT_BRAIN}\n\nKONTEKSTI I ANALIZËS (Arkiva + Baza Ligjore):\n{context}"
    
    try:
        stream = await client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {"role": "system", "content": full_system},
                {"role": "user", "content": f"Analizo këtë transaksion dhe kthe përgjigje me citime ligjore: {user_query}"}
            ],
            temperature=0.0, 
            stream=True
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except Exception as e:
        logger.error(f"Supreme Auditor Error: {e}")
        yield "[GABIM: Motori i citimeve ligjore nuk u përgjigj.]"