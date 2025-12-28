# FILE: backend/app/services/chat_service.py
# PHOENIX PROTOCOL - PERSONA TRANSFORMATION (BUSINESS CONSULTANT)
# 1. REFACTOR: Replaced the 'Juristi AI' persona with the 'Këshilltari i Biznesit' (Business Consultant) persona.
# 2. PROMPT: The new system prompt instructs the AI to be a helpful, encouraging business advisor for SMEs in Kosovo.
# 3. CONSTITUTION: Swapped the hardcoded STRICT_FORENSIC_RULES with the new BUSINESS_CONSULTANT_RULES from the llm_service.
# 4. STATUS: The main chat AI is now a Business Consultant. The Legal Agent is isolated to legal-specific tasks.

from __future__ import annotations
import os
import logging
import asyncio
from datetime import datetime, timezone
from typing import Any, Optional, List, Dict, cast

from fastapi import HTTPException
from bson import ObjectId
from bson.errors import InvalidId
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

from app.models.case import ChatMessage
import app.services.vector_store_service as vector_store_service
# PHOENIX: Import the new Business Constitution from the central LLM service
from app.services.llm_service import BUSINESS_CONSULTANT_RULES

logger = logging.getLogger(__name__)

# --- CONFIG ---
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_MODEL = "deepseek/deepseek-chat" 

# --- PHOENIX: NEW BUSINESS CONSULTANT PERSONA ---
SYSTEM_PROMPT_BUSINESS = f"""
Ti je "Këshilltari i Biznesit AI".
Përdoruesi është pronari i një biznesi të vogël ose të mesëm në Kosovë. Qëllimi yt është të ofrosh këshilla praktike, të qarta dhe motivuese.

{BUSINESS_CONSULTANT_RULES}

UDHËZIME PËR FORMATIM:
- Përdor pika (bullet points) për t'i bërë këshillat të lehta për t'u lexuar.
- Përdor **bold** për të theksuar konceptet më të rëndësishme.
- Jepi përgjigjes strukturë logjike dhe të lehtë për t'u ndjekur.
"""

async def get_http_chat_response(
    db: Any, 
    case_id: str, 
    user_query: str, 
    user_id: str,
    document_id: Optional[str] = None,
    jurisdiction: Optional[str] = 'ks'
) -> str:
    """
    Orchestrates the Business Consultant Chat using RAG.
    """
    try:
        oid = ObjectId(case_id)
        user_oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # 1. Verify access
    case = await db.cases.find_one({"_id": oid, "owner_id": user_oid})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    # 2. Get Chat History (Memory)
    raw_history = case.get("chat_history", [])
    memory_messages: List[ChatCompletionMessageParam] = []
    
    if raw_history:
        try:
            recent_history = raw_history[-6:] 
            for msg in recent_history:
                raw_role = msg.get('role') if isinstance(msg, dict) else getattr(msg, 'role', 'user')
                content = msg.get('content') if isinstance(msg, dict) else getattr(msg, 'content', '')
                api_role = "assistant" if raw_role == "ai" else "user"
                if content:
                    message = cast(ChatCompletionMessageParam, {"role": api_role, "content": str(content)})
                    memory_messages.append(message)
        except Exception as e:
            logger.warning(f"Failed to parse chat history: {e}")

    # 3. Save User Message
    try:
        await db.cases.update_one(
            {"_id": oid},
            {"$push": {"chat_history": ChatMessage(role="user", content=user_query, timestamp=datetime.now(timezone.utc)).model_dump()}}
        )
    except Exception as e:
        logger.error(f"DB Write Error: {e}")
    
    response_text: str = "" 
    try:
        # 4. RETRIEVAL STEP (RAG)
        # Querying with a business context
        rag_results = await asyncio.to_thread(
            vector_store_service.query_mixed_intelligence,
            user_id=user_id,
            query_text=user_query,
            n_results=8,
            case_context_id=case_id 
        )
        
        context_parts = []
        if rag_results:
            for item in rag_results:
                source = item.get("source", "I panjohur")
                text = item.get("text", "")
                context_parts.append(f"--- Kontekst nga '{source}' ---\n{text}")
            
            context_dossier = "\n\n".join(context_parts)
        else:
            context_dossier = "Nuk u gjet informacion relevant në dokumentet tuaja."

        # 5. GENERATION STEP (Business Consultant LLM)
        final_user_prompt = (
            f"=== Informacioni relevant nga dokumentet tuaja ===\n{context_dossier}\n\n"
            f"=== Pyetja e Pronarit të Biznesit ===\n{user_query}"
        )

        # PHOENIX: Use the new Business System Prompt
        messages_payload: List[ChatCompletionMessageParam] = [cast(ChatCompletionMessageParam, {"role": "system", "content": SYSTEM_PROMPT_BUSINESS})]
        
        if memory_messages:
            messages_payload.extend(memory_messages)
            
        final_message = cast(ChatCompletionMessageParam, {"role": "user", "content": final_user_prompt})
        messages_payload.append(final_message)

        if DEEPSEEK_API_KEY:
            client = AsyncOpenAI(api_key=DEEPSEEK_API_KEY, base_url=OPENROUTER_BASE_URL)
            
            completion = await client.chat.completions.create(
                model=OPENROUTER_MODEL,
                messages=messages_payload,
                temperature=0.2, # Slightly more creative for business advice
                max_tokens=1500, 
                extra_headers={"HTTP-Referer": "https://haveri.tech", "X-Title": "Haveri AI Business Chat"}
            )
            
            content = completion.choices[0].message.content
            response_text = content if content is not None else "Gabim në gjenerim nga AI."
        else:
            response_text = "⚠️ Konfigurimi i AI mungon (API Key missing)."

    except Exception as e:
        logger.error(f"AI Error: {e}", exc_info=True)
        response_text = "Kërkoj ndjesë, ndodhi një problem teknik gjatë procesimit të kërkesës suaj."

    # 6. Save AI Response
    try:
        await db.cases.update_one(
            {"_id": oid},
            {"$push": {"chat_history": ChatMessage(role="ai", content=response_text, timestamp=datetime.now(timezone.utc)).model_dump()}}
        )
    except Exception:
        pass

    return response_text