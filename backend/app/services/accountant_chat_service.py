# FILE: backend/app/services/accountant_chat_service.py
# PHOENIX PROTOCOL - ACCOUNTANT CHAT V1.3 (NAMING SYNC)
# 1. FIXED: Renamed function to 'chat_with_accountant' to match API endpoint.

from typing import AsyncGenerator
from . import accountant_vector_service as vs
from . import accountant_llm_service as llm

# PHOENIX: Name corrected to resolve the "unknown import symbol" error
async def chat_with_accountant(user_id: str, query: str) -> AsyncGenerator[str, None]:
    """
    The main engine for Havery Accountant Agent.
    """
    # 1. Build the Smart Context (User Data + Havery Laws)
    full_context = vs.get_combined_context(user_id, query)

    # 2. Stream Audit
    async for token in llm.stream_accountant_audit(full_context, query):
        yield token