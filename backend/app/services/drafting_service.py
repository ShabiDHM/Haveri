# FILE: backend/app/services/drafting_service.py
# PHOENIX PROTOCOL - HAVERI HYDRA DRAFTING V9.1 (PYLANCE RESOLUTION)
# 1. FIX: Switched to explicit 'stream_text_async' import to resolve Pylance error.
# 2. FEATURE: True token-by-token streaming with Semaphore protection.
# 3. STATUS: Fully synchronized with Juristi architecture.

import asyncio
import structlog
from typing import AsyncGenerator, Optional, Dict
from pymongo.database import Database

from ..models.user import UserInDB 
from .text_sterilization_service import sterilize_text_for_llm 

# PHOENIX FIX: Explicit function import to resolve Pylance attribute access issue
from .llm_service import stream_text_async
from . import vector_store_service

logger = structlog.get_logger(__name__)

# --- CONTEXT BUILDER (Optimized) ---
async def _retrieve_drafting_context(query: str, user_id: str, agent_type: str) -> str:
    """
    Gathers RAG context in parallel for the drafting agent.
    """
    # These vector queries are sync and benefit from running in separate threads
    tasks = [
        asyncio.to_thread(
            vector_store_service.query_private_diary,
            user_id=user_id,
            query_text=query,
            n_results=5
        ),
        asyncio.to_thread(
            vector_store_service.query_public_library,
            query_text=query,
            n_results=3,
            agent_type=agent_type
        )
    ]
    
    try:
        results = await asyncio.gather(*tasks)
        private_results, public_results = results[0], results[1]
    except Exception as e:
        logger.error(f"Haveri RAG Failed: {e}")
        return "Nuk u gjetën dokumente relevante."

    context_parts = []
    
    if private_results:
        private_text = "\n".join([f"- Nga '{r.get('source', 'dokument')}': {r.get('content', '')}" for r in private_results])
        context_parts.append(f"### FAKTE NGA DOKUMENTET E TUA:\n{private_text}")

    if public_results:
        public_text = "\n".join([f"- Nga burimi publik: {r.get('content', '')}" for r in public_results])
        context_parts.append(f"### INFORMACION RELEVANT:\n{public_text}")

    return "\n\n".join(context_parts) if context_parts else "Nuk u gjet informacion relevant. Përdor njohuritë e përgjithshme."

# --- PROMPT BUILDERS ---
async def _build_business_prompt(user: UserInDB, sanitized_prompt: str) -> Dict[str, str]:
    context = await _retrieve_drafting_context(query=sanitized_prompt, user_id=str(user.id), agent_type='business')
    
    system_prompt = """
    Ti je 'Haveri', një Asistent AI ekspert në hartimin e dokumenteve të biznesit në Shqip, i specializuar për tregun e Kosovës.
    
    RREGULLA KRITIKE:
    1.  **INJEKTO FAKTET:** Zbato faktet specifike (emra, data, shuma) nga seksioni "FAKTE NGA DOKUMENTET E TUA" në draftin përfundimtar. MOS përdor placeholders.
    2.  **MOS HAMENDËSO:** Nëse një fakt mungon, lëre bosh ose kërkoje, por mos shpik të dhëna.
    3.  **TONI:** Ruaj një ton formal, profesional dhe të qartë.
    """
    
    full_prompt = f"""
    --- FAKTE TË MBLEDHURA ---
    {context}
    --- FUNDI I FAKTEVE ---

    --- DETYRA ---
    Hartoni një dokument bazuar në kërkesën e mëposhtme:
    "{sanitized_prompt}"
    --- FUNDI I DETYRës ---

    Gjenero draftin përfundimtar, duke integruar faktet e mësipërme direkt në tekst.
    """
    return {"system": system_prompt, "user": full_prompt}

# --- MAIN GENERATOR (Refactored for TRUE Streaming) ---

async def generate_draft_stream(
    prompt_text: str, user: UserInDB, db: Database, draft_type: Optional[str] = "generic",
    case_id: Optional[str] = None
) -> AsyncGenerator[str, None]:
    
    sanitized_prompt = sterilize_text_for_llm(prompt_text)
    
    logger.info("Starting Haveri Hydra Drafting Job (V9.1)...")
    
    # 1. Build the prompt with parallel RAG
    prompts = await _build_business_prompt(user, sanitized_prompt)
    
    # 2. Call the TRUE streaming function directly from the explicit import
    # This automatically respects the Global Semaphore.
    try:
        async for token in stream_text_async(prompts["system"], prompts["user"], temp=0.1):
            yield token
    except Exception as e:
        logger.error(f"Haveri Stream Failed: {e}")
        yield "Më vjen keq, gjenerimi dështoi. Ju lutemi provoni përsëri."