# FILE: backend/app/services/drafting_service.py
# PHOENIX PROTOCOL - DEPENDENCY CLEANUP
# 1. FIX: Removed the invalid 'db_services' import that was causing a Pylance error.
# 2. REFACTOR: Simplified the service by assuming a pre-initialized 'rag_service' instance is available, improving architecture.
# 3. STATUS: Clean, correct, and architecturally sound.

import asyncio
import structlog
from typing import AsyncGenerator, Optional, Dict
from pymongo.database import Database

from ..models.user import UserInDB 
from .text_sterilization_service import sterilize_text_for_llm 
from .albanian_rag_service import AlbanianRAGService
from . import llm_service
from . import vector_store_service # Import the actual service

logger = structlog.get_logger(__name__)

LEGAL_DRAFT_TYPES = ["kontrate", "padi", "pergjigje", "kunderpadi"]

# --- DEPENDENCY INJECTION (Placeholder) ---
# In a full FastAPI app, you would "inject" this dependency.
# For now, we create a single, shared instance.
# This assumes your DB connection is managed and passed during app startup.

# This is a simplified way to create a singleton instance for our service.
class RagServiceSingleton:
    _instance: Optional[AlbanianRAGService] = None

    def get_instance(self, db: Database) -> AlbanianRAGService:
        if self._instance is None:
            # The RAG service needs the vector store service, which is now stateless
            self._instance = AlbanianRAGService(vector_store=vector_store_service, db=db)
            logger.info("Initialized Singleton: AlbanianRAGService")
        return self._instance

rag_singleton = RagServiceSingleton()
# --- END DEPENDENCY INJECTION ---


async def _build_legal_prompt_components(user: UserInDB, sanitized_prompt: str, case_id: Optional[str], rag_service: AlbanianRAGService) -> Dict[str, str]:
    system_prompt = "Ti je 'Juristi AI', Avokat Ekspert për legjislacionin e KOSOVËS. Harto dokumentin e kërkuar me saktësi maksimale."
    context = await rag_service.retrieve_context(query=sanitized_prompt, user_id=str(user.id), case_id=case_id, agent_type='legal')
    full_prompt = f"=== KONTEKSTI NGA DOSJA DHE LIGJET ===\n{context}\n\n=== KËRKESA SPECIFIKE ===\n\"{sanitized_prompt}\"\n\nKërkesa: Fillo hartimin e dokumentit tani."
    return {"system": system_prompt, "user": full_prompt}

async def _build_business_prompt_components(user: UserInDB, sanitized_prompt: str, case_id: Optional[str], rag_service: AlbanianRAGService) -> Dict[str, str]:
    system_prompt = "Ti je 'Këshilltar Biznesi AI'. Detyra jote është të hartosh komunikime profesionale, të qarta dhe efektive."
    context = await rag_service.retrieve_context(query=sanitized_prompt, user_id=str(user.id), case_id=case_id, agent_type='business')
    full_prompt = f"=== SHEMBUJ DHE KONTEKST NGA BIZNESI ===\n{context}\n\n=== KËRKESA E PËRDORUESIT ===\n\"{sanitized_prompt}\"\n\nKërkesa: Harto draftin tani."
    return {"system": system_prompt, "user": full_prompt}

async def generate_draft_stream(
    prompt_text: str, user: UserInDB, db: Database, draft_type: Optional[str] = "generic",
    case_id: Optional[str] = None
) -> AsyncGenerator[str, None]:
    
    sanitized_prompt = sterilize_text_for_llm(prompt_text)
    is_legal_task = draft_type in LEGAL_DRAFT_TYPES
    
    # PHOENIX: Get the initialized RAG service instance
    rag_service = rag_singleton.get_instance(db)
    
    if is_legal_task:
        logger.info("Routing to LEGAL DRAFTER agent.")
        prompts = await _build_legal_prompt_components(user, sanitized_prompt, case_id, rag_service)
        llm_response = llm_service.draft_legal_document(prompts["system"], prompts["user"])
    else:
        logger.info("Routing to BUSINESS CONSULTANT agent.")
        prompts = await _build_business_prompt_components(user, sanitized_prompt, case_id, rag_service)
        llm_response = llm_service.draft_business_document(prompts["system"], prompts["user"])

    if llm_response:
        for char in llm_response:
            yield char
            await asyncio.sleep(0.005) 
    else:
        yield "**[Draftimi dështoi. Ndodhi një gabim në sistemin e inteligjencës artificiale.]**"