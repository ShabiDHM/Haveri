# FILE: backend/app/services/chat_service.py
# PHOENIX PROTOCOL - SSE INTEGRATION FIX
# 1. INTEGRATION: Imported and now calls the new 'broadcast_message' service.
# 2. LOGIC: After the AI response is generated and saved, it is immediately broadcasted back to the user's browser.
# 3. STATUS: This completes the real-time chat loop, fixing the "message not appearing" bug.

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
from app.services.llm_service import BUSINESS_CONSULTANT_RULES
# PHOENIX: Import the new broadcasting service
from app.services.streaming_service import broadcast_message

logger = logging.getLogger(__name__)

# --- CONFIG ---
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_MODEL = "deepseek/deepseek-chat" 

SYSTEM_PROMPT_BUSINESS = f"""
Ti je "Këshilltari i Biznesit AI".
Përdoruesi është pronari i një biznesi të vogël ose të mesëm në Kosovë. Qëllimi yt është të ofrosh këshilla praktike, të qarta dhe motivuese.
{BUSINESS_CONSULTANT_RULES}
UDHËZIME PËR FORMATIM: Përdor pika (bullet points) dhe **bold** për të theksuar konceptet.
"""

async def get_http_chat_response(
    db: Any, 
    case_id: str, 
    user_query: str, 
    user_id: str,
    document_id: Optional[str] = None,
    jurisdiction: Optional[str] = 'ks'
) -> str:
    try:
        oid = ObjectId(case_id)
        user_oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    case = await db.cases.find_one({"_id": oid, "owner_id": user_oid})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    raw_history = case.get("chat_history", [])
    memory_messages: List[ChatCompletionMessageParam] = []
    if raw_history:
        try:
            for msg in raw_history[-6:]:
                api_role = "assistant" if msg.get('role') == "ai" else "user"
                if msg.get('content'):
                    memory_messages.append(cast(ChatCompletionMessageParam, {"role": api_role, "content": str(msg.get('content'))}))
        except Exception as e:
            logger.warning(f"Failed to parse chat history: {e}")

    await db.cases.update_one(
        {"_id": oid},
        {"$push": {"chat_history": ChatMessage(role="user", content=user_query, timestamp=datetime.now(timezone.utc)).model_dump()}}
    )
    
    response_text: str = "" 
    try:
        rag_results = await asyncio.to_thread(vector_store_service.query_mixed_intelligence, user_id=user_id, query_text=user_query, n_results=8, case_context_id=case_id)
        context_parts = [f"--- Kontekst nga '{item.get('source', 'I panjohur')}' ---\n{item.get('text', '')}" for item in rag_results] if rag_results else []
        context_dossier = "\n\n".join(context_parts) if context_parts else "Nuk u gjet informacion relevant në dokumentet tuaja."

        final_user_prompt = f"=== Informacioni relevant ===\n{context_dossier}\n\n=== Pyetja ime ===\n{user_query}"
        messages_payload: List[ChatCompletionMessageParam] = [cast(ChatCompletionMessageParam, {"role": "system", "content": SYSTEM_PROMPT_BUSINESS})]
        if memory_messages:
            messages_payload.extend(memory_messages)
        messages_payload.append(cast(ChatCompletionMessageParam, {"role": "user", "content": final_user_prompt}))

        if DEEPSEEK_API_KEY:
            client = AsyncOpenAI(api_key=DEEPSEEK_API_KEY, base_url=OPENROUTER_BASE_URL)
            completion = await client.chat.completions.create(
                model=OPENROUTER_MODEL, messages=messages_payload, temperature=0.2, max_tokens=1500, 
                extra_headers={"HTTP-Referer": "https://haveri.tech", "X-Title": "Haveri AI Business Chat"}
            )
            response_text = completion.choices[0].message.content or "Gabim në gjenerim nga AI."
        else:
            response_text = "⚠️ Konfigurimi i AI mungon (API Key missing)."

    except Exception as e:
        logger.error(f"AI Error: {e}", exc_info=True)
        response_text = "Kërkoj ndjesë, ndodhi një problem teknik gjatë procesimit të kërkesës suaj."

    try:
        await db.cases.update_one(
            {"_id": oid},
            {"$push": {"chat_history": ChatMessage(role="ai", content=response_text, timestamp=datetime.now(timezone.utc)).model_dump()}}
        )

        # PHOENIX FIX: Broadcast the AI's response back to the user via SSE
        await broadcast_message(
            user_id=user_id,
            message_data={
                "type": "CHAT_MESSAGE",
                "case_id": case_id,
                "content": response_text
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to save or broadcast AI response: {e}")

    return response_text