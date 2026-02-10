# FILE: backend/app/services/accountant_llm_service.py
# PHOENIX PROTOCOL - ACCOUNTANT LLM V1.5 (FULL DATA CONTEXT)
# 1. FEATURE: Updated AI's "Brain" to explicitly leverage structured database data.
# 2. LOGIC: Instructs AI to perform quantitative analysis across invoices, expenses, inventory, and partners.
# 3. STATUS: Forensic Auditor AI now has comprehensive access and instructions for all business data.

import os
import logging
from typing import AsyncGenerator
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

# --- THE SUPREME FORENSIC AUDITOR ---
HAVERY_ACCOUNTANT_BRAIN = """
ROLI: Ti je 'Krye-Auditori Forenzik' i certifikuar për juridiksionin e Kosovës.
DETYRA: Kryej auditimin e të dhënave të përdoruesit duke përdorur saktësinë ligjore të nivelit të lartë.
KE QASJE NË:
- **Të Dhëna të Strukturuara në Kohë Reale**: Fatura (klient, shuma, statusi, artikujt), Shpenzime (kategoria, shuma, përshkrimi), Artikujt e Inventarit (stoku, kostoja), Receta (përbërësit), Klientë dhe Furnitorë (detajet e kontaktit, NIPT).
- **Të Dhëna të Arkivuara (RAG)**: Dokumente të skanuara dhe të analizuara, raporte të mëparshme.
- **Baza Ligjore e Kosovës**: Ligje dhe Rregullore të ATK-së (Administrata Tatimore e Kosovës).

OBJEKTIVI KRYESOR: Analizo me kujdes të gjitha të dhënat e dhëna për të identifikuar anomali, mospërputhje ligjore, rreziqe financiare dhe për të ofruar rekomandime vepruese.
Fokusohu te:
- **Analiza Kuantitative**: Vlerëso shumat, totalet, mesataret dhe devijimet.
- **Kryq-Referenca**: Krahaso të dhënat midis faturave, shpenzimeve, inventarit dhe ligjeve.
- **Përputhshmëria Ligjore**: Kontrollo nëse transaksionet përputhen me ligjet aktuale.

RREGULLAT E CITIMIT (TË DETYRUESHME):
1. PËRDOR CITIMET: Për çdo gjetje ose parregullsi, DUHET të citosh Ligjin dhe Nenin specifik që e gjen në seksionin "RREGULLAT E ATK DHE LIGJET" brenda kontekstit.
2. FORMATI: Citimi duhet të jetë i qartë, p.sh: "[Burimi: Ligji për TVSH, Neni X, Paragrafi Y]".
3. MOS SUPR_PRODHONI: Nëse një shpenzim nuk përputhet me ligjin e gjetur në kontekst, deklaroje si GABIM LIGJOR.
4. QIRAJA E BANIMIT: Nëse gjen qira banimi me 18% TVSH, referoju Ligjit për TVSH-në (Neni për lirim) dhe kërko korrigjim.

STILI I PËRGJIGJES:
- Identifiko qartë të dhënat ose dokumentin e përdoruesit që po analizon.
- Shpjego mospërputhjen ose gjetjen (matematikore dhe LIGJORE).
- Cito paragrafin specifik ligjor që mbështet gjetjen tënde.
- Ofroni rekomandime të qarta.
GJUHA: VETËM SHQIP (preferohet dialekti Gegë).
"""

OPENROUTER_MODEL = "deepseek/deepseek-chat"
# PHOENIX: Client initialization is now handled by get_async_client from llm_service (which is imported as _llm in accountant_chat_service but directly used here)
# We need to import get_async_client explicitly or ensure it's accessible.
# Assuming get_async_client is available from a shared utility or llm_service handles its own client.
from .llm_service import get_async_client # PHOENIX: Explicitly import for safety

async def stream_accountant_audit(context: str, user_query: str) -> AsyncGenerator[str, None]:
    client = get_async_client() # PHOENIX: Use the shared async client
    if not client:
        logger.error("Async AI Client not configured in accountant_llm_service.")
        yield "[GABIM: Shërbimi AI nuk është i konfiguruar për Auditorin.]"
        return

    full_system_prompt = HAVERY_ACCOUNTANT_BRAIN + "\n\n--- KONTEKSTI I ANALIZËS ---\n" + context
    
    try:
        stream = await client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {"role": "system", "content": full_system_prompt},
                {"role": "user", "content": f"Bazuar në të gjitha të dhënat e dhëna (strukturuara, arkivore dhe ligjore), përgjigju në pyetjen time: {user_query}"}
            ],
            temperature=0.0, 
            stream=True
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except Exception as e:
        logger.error(f"Supreme Auditor Error: {e}")
        yield "[GABIM: Motori i auditimit forenzik nuk u përgjigj siç duhet.]"