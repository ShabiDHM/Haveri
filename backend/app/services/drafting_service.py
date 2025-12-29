# FILE: backend/app/services/drafting_service.py
# PHOENIX PROTOCOL - DRAFTING SERVICE V7.0 (DIRECT TOOL USE)
# 1. REFACTOR: Removed dependency on the Chat Agent class.
# 2. LOGIC: Queries 'vector_store_service' tools directly to build context.
# 3. FIX: Resolves Pylance errors regarding 'retrieve_context' and constructor arguments.

import asyncio
import structlog
from typing import AsyncGenerator, Optional, Dict
from pymongo.database import Database

from ..models.user import UserInDB 
from .text_sterilization_service import sterilize_text_for_llm 
from . import llm_service
from . import vector_store_service

logger = structlog.get_logger(__name__)

# PHOENIX: Simplified list to only include 'kontrate'
LEGAL_DRAFT_TYPES = ["kontrate"]

# --- CONTEXT BUILDER (Replaces old RAG method) ---
async def _retrieve_drafting_context(query: str, user_id: str, case_id: Optional[str], agent_type: str) -> str:
    """
    Directly queries the Vector Store Tools to gather context for the draft.
    """
    # 1. Private Data (User's Templates/Docs)
    private_results = await asyncio.to_thread(
        vector_store_service.query_private_diary,
        user_id=user_id,
        query_text=query,
        n_results=5,
        case_context_id=case_id
    )
    
    # 2. Public Data (Laws/Business Rules)
    public_results = await asyncio.to_thread(
        vector_store_service.query_public_library,
        query_text=query,
        n_results=5,
        agent_type=agent_type
    )

    # Format for LLM
    context_parts = []
    
    private_text = "\n".join([f"DOKUMENTI: '{r['source']}'\nPËRMBAJTJA:\n{r['content']}\n---" for r in private_results])
    if private_text:
        context_parts.append(f"### NGA DOKUMENTET TUAJA (PRIVATE):\n{private_text}")

    public_text = "\n".join([f"BURIMI: '{r['source']}'\nTEKSTI:\n{r['content']}\n---" for r in public_results])
    if public_text:
        context_parts.append(f"### NGA BAZA E DIJES (PUBLIKE):\n{public_text}")

    if not context_parts:
        return "Nuk u gjet informacion shtesë."
    
    return "\n\n".join(context_parts)

# --- PROMPT BUILDERS ---

async def _build_legal_prompt_components(user: UserInDB, sanitized_prompt: str, case_id: Optional[str]) -> Dict[str, str]:
    system_prompt = "Ti je 'Juristi AI', Avokat Ekspert për legjislacionin e KOSOVËS. Harto dokumentin e kërkuar me saktësi maksimale."
    context = await _retrieve_drafting_context(query=sanitized_prompt, user_id=str(user.id), case_id=case_id, agent_type='legal')
    full_prompt = f"=== KONTEKSTI NGA DOSJA DHE LIGJET ===\n{context}\n\n=== KËRKESA SPECIFIKE ===\n\"{sanitized_prompt}\"\n\nKërkesa: Fillo hartimin e dokumentit tani."
    return {"system": system_prompt, "user": full_prompt}

async def _build_business_prompt_components(user: UserInDB, sanitized_prompt: str, case_id: Optional[str]) -> Dict[str, str]:
    system_prompt = "Ti je 'Këshilltar Biznesi AI'. Detyra jote është të hartosh komunikime profesionale, të qarta dhe efektive."
    context = await _retrieve_drafting_context(query=sanitized_prompt, user_id=str(user.id), case_id=case_id, agent_type='business')
    full_prompt = f"=== SHEMBUJ DHE KONTEKST NGA BIZNESI ===\n{context}\n\n=== KËRKESA E PËRDORUESIT ===\n\"{sanitized_prompt}\"\n\nKërkesa: Harto draftin tani."
    return {"system": system_prompt, "user": full_prompt}

# --- MAIN GENERATOR ---

async def generate_draft_stream(
    prompt_text: str, user: UserInDB, db: Database, draft_type: Optional[str] = "generic",
    case_id: Optional[str] = None
) -> AsyncGenerator[str, None]:
    
    sanitized_prompt = sterilize_text_for_llm(prompt_text)
    is_legal_task = draft_type in LEGAL_DRAFT_TYPES
    
    # PHOENIX: Directly build prompts without instantiating the Chat Agent
    if is_legal_task:
        logger.info("Routing to LEGAL DRAFTER flow.")
        prompts = await _build_legal_prompt_components(user, sanitized_prompt, case_id)
        llm_response = llm_service.draft_legal_document(prompts["system"], prompts["user"])
    else:
        logger.info("Routing to BUSINESS CONSULTANT flow.")
        prompts = await _build_business_prompt_components(user, sanitized_prompt, case_id)
        llm_response = llm_service.draft_business_document(prompts["system"], prompts["user"])

    if llm_response:
        # Simulate streaming for text completion (since llm_service returns string)
        for char in llm_response:
            yield char
            await asyncio.sleep(0.005) 
    else:
        yield "**[Draftimi dështoi. Ndodhi një gabim në sistemin e inteligjencës artificiale.]**"