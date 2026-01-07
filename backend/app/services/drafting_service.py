# FILE: backend/app/services/drafting_service.py
# PHOENIX PROTOCOL - DRAFTING SERVICE V8.0 (BUSINESS-FIRST)
# 1. LOGIC: Uses 'ask_business_consultant' logic (User Data + Law) to frame drafts.
# 2. PROMPT: Optimized for "Business Consultant" output (Professional Albanian).
# 3. STREAMING: Retained generator structure for frontend compatibility.

import asyncio
import structlog
from typing import AsyncGenerator, Optional, Dict
from pymongo.database import Database

from ..models.user import UserInDB 
from .text_sterilization_service import sterilize_text_for_llm 
from . import llm_service
from . import vector_store_service

logger = structlog.get_logger(__name__)

# --- CONTEXT BUILDER ---
async def _retrieve_drafting_context(query: str, user_id: str, agent_type: str) -> str:
    """
    Directly queries the Vector Store Tools to gather context for the draft.
    Prioritizes User Data (Internal) over Public Data (External).
    """
    # 1. Private Data (Internal Docs/Templates)
    private_results = await asyncio.to_thread(
        vector_store_service.query_private_diary,
        user_id=user_id,
        query_text=query,
        n_results=3
    )
    
    # 2. Public Data (Laws/Regulations for Compliance)
    public_results = await asyncio.to_thread(
        vector_store_service.query_public_library,
        query_text=query,
        n_results=3,
        agent_type=agent_type
    )

    context_parts = []
    
    if private_results:
        private_text = "\n".join([f"- {r['source']}: {r['content']}" for r in private_results])
        context_parts.append(f"### TË DHËNAT E BRENDSHME TË BIZNESIT:\n{private_text}")

    if public_results:
        public_text = "\n".join([f"- {r['source']}: {r['content']}" for r in public_results])
        context_parts.append(f"### BAZA LIGJORE DHE RREGULLATORE:\n{public_text}")

    if not context_parts:
        return "Nuk u gjet informacion shtesë. Përdor njohuritë e përgjithshme."
    
    return "\n\n".join(context_parts)

# --- PROMPT BUILDERS ---

async def _build_business_prompt(user: UserInDB, sanitized_prompt: str) -> Dict[str, str]:
    context = await _retrieve_drafting_context(query=sanitized_prompt, user_id=str(user.id), agent_type='business')
    
    system_prompt = """
    Ti je 'Haveri', Konsulenti Inteligjent i Biznesit.
    DETYRA: Harto një dokument/email profesional biznesi në gjuhën Shqipe.
    
    UDHËZIME:
    1. Përdor 'TË DHËNAT E BRENDSHME' për të mbushur detajet (emra, shuma, data).
    2. Sigurohu që dokumenti të jetë në përputhje me 'BAZËN LIGJORE'.
    3. Stili duhet të jetë formal, i qartë dhe bindës.
    """
    
    full_prompt = f"""
    === KONTEKSTI ===
    {context}

    === KËRKESA E PËRDORUESIT ===
    "{sanitized_prompt}"

    DRAFTI PËRFUNDIMTAR (Në Shqip):
    """
    return {"system": system_prompt, "user": full_prompt}

# --- MAIN GENERATOR ---

async def generate_draft_stream(
    prompt_text: str, user: UserInDB, db: Database, draft_type: Optional[str] = "generic",
    case_id: Optional[str] = None
) -> AsyncGenerator[str, None]:
    
    sanitized_prompt = sterilize_text_for_llm(prompt_text)
    
    logger.info("Starting Business Drafting Job...")
    prompts = await _build_business_prompt(user, sanitized_prompt)
    
    # We use the business document drafter from LLM Service
    llm_response = await asyncio.to_thread(
        llm_service.draft_business_document,
        prompts["system"], 
        prompts["user"]
    )

    if llm_response:
        # Simulate streaming to keep frontend happy
        chunk_size = 10
        for i in range(0, len(llm_response), chunk_size):
            yield llm_response[i:i+chunk_size]
            await asyncio.sleep(0.01) 
    else:
        yield "Më vjen keq, nuk munda ta gjeneroj draftin. Provoni të jepni më shumë detaje."