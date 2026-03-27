# FILE: backend/app/services/accountant_chat_service.py
# PHOENIX PROTOCOL - ACCOUNTANT CHAT V1.5 (WORKSPACE FILTERING)

from typing import AsyncGenerator, Optional
from . import accountant_vector_service as vs
from . import accountant_llm_service as llm

async def chat_with_accountant(user_id: str, query: str, case_id: Optional[str] = None) -> AsyncGenerator[str, None]:
    """
    The main engine for Havery Accountant Agent, orchestrating context retrieval and AI streaming.
    """
    # 1. Build the Smart Context (User Data + Havery Laws + Structured DB Data)
    full_context = await vs.get_combined_context(user_id, query, case_id)

    # 2. Stream Audit
    async for token in llm.stream_accountant_audit(full_context, query):
        yield token