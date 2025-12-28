# FILE: backend/app/services/albanian_rag_service.py
# PHOENIX PROTOCOL - AGENT-AWARE RAG
# 1. REFACTOR: The 'retrieve_context' function now accepts an 'agent_type'.
# 2. LOGIC: It passes this 'agent_type' down to the 'query_mixed_intelligence' service.
# 3. FORMATTING: Updated context headers to be more generic ("Baza e Dijes" instead of "Baza Ligjore").

import asyncio
import logging
from typing import List, Optional, Dict, Protocol, Any
from bson import ObjectId

logger = logging.getLogger(__name__)

class VectorStoreServiceProtocol(Protocol):
    def query_mixed_intelligence(self, user_id: str, query_text: str, agent_type: str, n_results: int, case_context_id: Optional[str]) -> List[Dict[str, Any]]: ...

class AlbanianRAGService:
    def __init__(self, vector_store: VectorStoreServiceProtocol, db: Any):
        self.vector_store = vector_store
        self.db = db

    async def _get_case_summary(self, case_id: str) -> str:
        try:
            if not self.db or not case_id: return ""
            case = await self.db.cases.find_one({"_id": ObjectId(case_id)}, {"title": 1, "description": 1})
            if not case: return ""
            summary_parts = [f"EMRI I PROJEKTIT: {case.get('title')}", f"PËRSHKRIMI: {case.get('description')}"]
            return "\n".join(filter(None, summary_parts))
        except Exception as e:
            logger.warning(f"Failed to fetch case summary for RAG: {e}")
            return ""

    # PHOENIX: Added agent_type to the signature
    async def retrieve_context(
        self, 
        query: str, 
        user_id: str,
        case_id: Optional[str] = None, 
        agent_type: str = 'business'
    ) -> str:
        from .embedding_service import generate_embedding

        case_summary = await self._get_case_summary(case_id) if case_id else ""
        enriched_query = f"{case_summary}\n\nPyetja Specifike: {query}"

        try:
            query_embedding = await asyncio.to_thread(generate_embedding, enriched_query, 'standard')
            if not query_embedding: return ""
        except Exception as e:
            logger.error(f"RAG: Embedding generation failed: {e}")
            return ""

        # PHOENIX: Call vector store with the specified agent type
        rag_results = await asyncio.to_thread(
            self.vector_store.query_mixed_intelligence,
            user_id=user_id,
            query_text=enriched_query,
            agent_type=agent_type,
            n_results=8,
            case_context_id=case_id
        )

        context_parts = []
        if case_summary:
            context_parts.append(f"### PËRMBLEDHJA E PROJEKTIT:\n{case_summary}")
        
        private_docs_text = "\n".join([f"DOKUMENTI: '{chunk.get('source')}'\nPËRMBAJTJA:\n{chunk.get('text')}\n---" for chunk in rag_results if chunk.get('type') == 'PRIVATE_DATA'])
        if private_docs_text:
            context_parts.append(f"### FRAGMENTE NGA DOKUMENTET TUAJA:\n{private_docs_text}")
            
        public_docs_text = "\n".join([f"DOKUMENTI: '{chunk.get('source')}'\nTEKSTI:\n{chunk.get('text')}\n---" for chunk in rag_results if chunk.get('type') == 'PUBLIC_KNOWLEDGE'])
        if public_docs_text:
            # PHOENIX: Generic Header
            context_parts.append(f"### INFORMACION NGA BAZA E DIJES:\n{public_docs_text}")
        
        if not context_parts: return "Nuk u gjet asnjë informacion relevant."
        return "\n\n".join(context_parts)