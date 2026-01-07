# FILE: backend/app/services/chat_service.py
# PHOENIX PROTOCOL - CHAT SERVICE V4.1 (TYPE FIX)
# 1. FIX: Corrected type hint for 'history' from List[ChatMessage] to List[dict].
#    - REASON: MongoDB returns raw dictionaries, not Pydantic instances. Pylance correctly flagged the mismatch.
# 2. SAFETY: Used .get() for dictionary access to prevent potential KeyErrors on malformed history.

from __future__ import annotations
import logging
import asyncio
from datetime import datetime, timezone
from typing import Any, Optional, List, Dict

from fastapi import HTTPException
from bson import ObjectId
from bson.errors import InvalidId

from app.models.case import ChatMessage
from app.services import llm_service
from app.services.streaming_service import broadcast_message

logger = logging.getLogger(__name__)

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

    # 1. Validate Access
    case = await db.cases.find_one({"_id": oid, "owner_id": user_oid})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    # 2. Get Short-Term History (Last 3 interactions)
    # PHOENIX FIX: Typed as List[Dict] because MongoDB returns dicts, not Pydantic objects.
    history: List[Dict[str, Any]] = case.get("chat_history", [])[-6:] 
    history_context = "\n".join([f"{msg.get('role', 'UNKNOWN').upper()}: {msg.get('content', '')}" for msg in history])

    # 3. Save User Message
    await db.cases.update_one(
        {"_id": oid},
        {"$push": {"chat_history": ChatMessage(role="user", content=user_query, timestamp=datetime.now(timezone.utc)).model_dump()}}
    )
    
    # 4. Execute Business Intelligence Engine
    response_text: str = "" 
    try:
        # Combine history with current query for the RAG Engine
        full_query = f"KONTEKSTI I BISEDËS:\n{history_context}\n\nPYETJA E RE:\n{user_query}"
        
        # This calls the Dual-Source RAG (User Data + Public Laws) from llm_service
        response_text = await asyncio.to_thread(
            llm_service.ask_business_consultant,
            user_id=user_id,
            query=full_query
        )

    except Exception as e:
        logger.error(f"AI Engine Error: {e}", exc_info=True)
        response_text = "Më vjen keq, nuk munda të procesoj kërkesën tuaj momentalisht."

    # 5. Save & Broadcast AI Response
    try:
        timestamp = datetime.now(timezone.utc)
        await db.cases.update_one(
            {"_id": oid},
            {"$push": {"chat_history": ChatMessage(role="ai", content=response_text, timestamp=timestamp).model_dump()}}
        )

        await broadcast_message(
            user_id=user_id,
            message_data={
                "type": "CHAT_MESSAGE",
                "case_id": case_id,
                "content": response_text,
                "timestamp": timestamp.isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to save/broadcast AI response: {e}")

    return response_text