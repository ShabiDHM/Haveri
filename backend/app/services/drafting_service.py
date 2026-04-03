# FILE: backend/app/services/drafting_service.py
# PHOENIX PROTOCOL - DRAFTING SERVICE V1.8 (REMOVED SECRETSTR IMPORT)

import os
import logging
from typing import AsyncGenerator
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from app.services import vector_store_service

logger = logging.getLogger(__name__)

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_MODEL = "deepseek/deepseek-chat"

class DraftingService:
    def __init__(self):
        pass
        
    async def get_legal_context(self, query: str, top_k: int = 5) -> str:
        try:
            results = vector_store_service.query_public_library(
                query_text=query,
                n_results=top_k,
                agent_type='business'
            )
            return "\n\n".join([item.get('content', '') for item in results])
        except Exception as e:
            logger.error(f"Failed to fetch legal context: {e}")
            return ""
    
    async def draft_document_stream(
        self,
        user_prompt: str,
        document_type: str = "generic",
        include_legal_context: bool = True
    ) -> AsyncGenerator[str, None]:
        
        if not DEEPSEEK_API_KEY:
            yield "Error: AI service not configured."
            return
        
        system_prompt = self._build_system_prompt(document_type)
        legal_context = await self.get_legal_context(user_prompt) if include_legal_context else ""
        full_prompt = self._build_full_prompt(user_prompt, legal_context, document_type)
        
        try:
            llm = ChatOpenAI(
                model=OPENROUTER_MODEL,
                base_url=OPENROUTER_BASE_URL,
                api_key=DEEPSEEK_API_KEY,  # type: ignore[arg-type]
                temperature=0.3,
                streaming=True,
                timeout=120
            )
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=full_prompt)
            ]
            
            async for chunk in llm.astream(messages):
                if chunk.content:
                    yield str(chunk.content)
            
        except Exception as e:
            logger.error(f"Draft generation failed: {e}")
            yield f"\n[Error generating document: {str(e)}]"
    
    def _build_system_prompt(self, document_type: str) -> str:
        base_prompt = """You are a professional legal document assistant. Generate well-structured legal documents in Albanian language.
        
**Formatting Requirements:**
1. Use proper legal document structure with numbered articles or sections
2. Include placeholders in brackets [ ] for client-specific information
3. Use clear, formal language
4. Format with clear headings and paragraphs
"""
        type_specific = {
            "generic": "Create a general legal document based on the instructions provided.",
            "employment_contract": "Create an employment contract with standard clauses.",
            "nda": "Create a Non-Disclosure Agreement.",
            "lease_agreement": "Create a commercial or residential lease agreement.",
        }
        return f"{base_prompt}\n\n**Document Type:** {type_specific.get(document_type, type_specific['generic'])}"
    
    def _build_full_prompt(self, user_prompt: str, legal_context: str, document_type: str) -> str:
        context_section = f"## LEGAL REFERENCE\n\n{legal_context}\n\n---\n" if legal_context else ""
        return f"{context_section}\n## USER INSTRUCTIONS\n{user_prompt}\n\n## OUTPUT\nGenerate a professional legal document in Albanian."