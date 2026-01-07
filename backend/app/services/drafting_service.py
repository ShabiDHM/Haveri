# FILE: backend/app/services/drafting_service.py
# PHOENIX PROTOCOL - DRAFTING SERVICE V8.1 (CONTEXT INJECTION FIX)
# 1. FIX: Re-engineered the final user prompt to explicitly instruct the LLM to USE the provided context.
# 2. LOGIC: Separated "Facts" from the "Task" to prevent the AI from ignoring the data.
# 3. RESULT: Drafts will now be pre-filled with specific names, dates, and amounts found in the RAG context.

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
    """
    private_results = await asyncio.to_thread(
        vector_store_service.query_private_diary,
        user_id=user_id,
        query_text=query,
        n_results=5 # Increased results for better context fill
    )
    
    public_results = await asyncio.to_thread(
        vector_store_service.query_public_library,
        query_text=query,
        n_results=3,
        agent_type=agent_type
    )

    context_parts = []
    
    if private_results:
        private_text = "\n".join([f"- Nga dokumenti '{r.get('source', 'Unknown')}': {r.get('content', '')}" for r in private_results])
        context_parts.append(f"### FAKTE NGA DOKUMENTET E TUA:\n{private_text}")

    if public_results:
        public_text = "\n".join([f"- Nga burimi '{r.get('source', 'Unknown')}': {r.get('content', '')}" for r in public_results])
        context_parts.append(f"### INFORMACION NGA LIGJET DHE RREGULLORET:\n{public_text}")

    if not context_parts:
        return "Nuk u gjet informacion relevant. Përdor njohuritë e përgjithshme."
    
    return "\n\n".join(context_parts)

# --- PROMPT BUILDERS ---

async def _build_business_prompt(user: UserInDB, sanitized_prompt: str) -> Dict[str, str]:
    context = await _retrieve_drafting_context(query=sanitized_prompt, user_id=str(user.id), agent_type='business')
    
    system_prompt = """
    Ti je 'Haveri', një Asistent AI ekspert në hartimin e dokumenteve të biznesit në Shqip, i specializuar për tregun e Kosovës.
    DETYRA JOTE: Harto një dokument profesional bazuar në kërkesën e përdoruesit dhe faktet e ofruara. MOS PËRDOR PLACEHOLDERS.
    
    RREGULLA KRITIKE:
    1.  **INJEKTO FAKTET:** Zbato faktet specifike (emra, data, shuma) nga seksioni "FAKTE NGA DOKUMENTET E TUA" në draftin përfundimtar.
    2.  **MOS HAMENDËSO:** Nëse një fakt specifik mungon (p.sh., arsyeja për shtyrje), lëre bosh ose kërkoje në mënyrë profesionale, por mos shpik të dhëna.
    3.  **SIGURO KONFORMITETIN:** Sigurohu që drafti të jetë në përputhje me "INFORMACIONIN NGA LIGJET".
    4.  **TONI:** Ruaj një ton formal dhe profesional.
    """
    
    # PHOENIX FIX: Restructured prompt for better context injection
    full_prompt = f"""
    --- FAKTE TË MBLEDHURA ---
    {context}
    --- FUNDI I FAKTEVE ---

    --- DETYRA ---
    Hartoni një dokument bazuar në kërkesën e mëposhtme:
    "{sanitized_prompt}"
    --- FUNDI I DETYRës ---

    Tani, gjenero draftin përfundimtar, duke integruar faktet e mësipërme direkt në tekst.
    """
    return {"system": system_prompt, "user": full_prompt}

# --- MAIN GENERATOR ---

async def generate_draft_stream(
    prompt_text: str, user: UserInDB, db: Database, draft_type: Optional[str] = "generic",
    case_id: Optional[str] = None
) -> AsyncGenerator[str, None]:
    
    sanitized_prompt = sterilize_text_for_llm(prompt_text)
    
    logger.info("Starting Business Drafting Job with Enhanced Context Injection...")
    prompts = await _build_business_prompt(user, sanitized_prompt)
    
    llm_response = await asyncio.to_thread(
        llm_service.draft_business_document,
        prompts["system"], 
        prompts["user"]
    )

    if llm_response:
        chunk_size = 10
        for i in range(0, len(llm_response), chunk_size):
            yield llm_response[i:i+chunk_size]
            await asyncio.sleep(0.01) 
    else:
        yield "Më vjen keq, nuk munda ta gjeneroj draftin. Provoni të jepni më shumë detaje."