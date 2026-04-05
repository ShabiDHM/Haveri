# FILE: backend/app/services/accountant_chat_service.py
# PHOENIX PROTOCOL - ACCOUNTANT CHAT V1.6 (YEAR FILTERING)

from typing import AsyncGenerator, Optional
from . import accountant_vector_service as vs
from . import accountant_llm_service as llm

async def chat_with_accountant(
    user_id: str, 
    query: str, 
    case_id: Optional[str] = None,
    year: Optional[int] = None
) -> AsyncGenerator[str, None]:
    """
    The main engine for Havery Accountant Agent, orchestrating context retrieval and AI streaming.
    """
    # Build the Smart Context with year filtering
    full_context = await vs.get_combined_context(user_id, query, case_id, year)

    # Stream Audit
    async for token in llm.stream_accountant_audit(full_context, query):
        yield token