# FILE: backend/app/services/chat_service.py
# PHOENIX PROTOCOL - CHAT SERVICE V4.1 (REWIRED)
# 1. REFACTOR: Removed the obsolete 'AlbanianRAGService'.
# 2. CORE: Now calls 'llm_service.ask_business_consultant' when 'agent_type' is 'business'.
# 3. ALIGNMENT: The chat system now correctly uses the Business Intelligence Engine.

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
    jurisdiction: Optional[str] = 'ks',
    agent_type: str = 'business' # PHOENIX: Added agent_type parameter
) -> str:
    try:
        oid = ObjectId(case_id)
        user_oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    case = await db.cases.find_one({"_id": oid, "owner_id": user_oid})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    history: List[Dict[str, Any]] = case.get("chat_history", [])[-6:] 
    history_context = "\n".join([f"{msg.get('role', 'UNKNOWN').upper()}: {msg.get('content', '')}" for msg in history])

    await db.cases.update_one(
        {"_id": oid},
        {"$push": {"chat_history": ChatMessage(role="user", content=user_query, timestamp=datetime.now(timezone.utc)).model_dump()}}
    )
    
    response_text: str = "" 
    try:
        full_query = f"KONTEKSTI I BISEDËS:\n{history_context}\n\nPYETJA E RE:\n{user_query}"
        
        # --- PHOENIX: INTELLIGENCE ROUTING ---
        if agent_type == 'business':
            logger.info(f"🧠 Routing to Business Consultant for User {user_id}")
            response_text = await asyncio.to_thread(
                llm_service.ask_business_consultant,
                user_id=user_id,
                query=full_query
            )
        else:
            # Fallback for any future 'legal' agent or other types
            logger.warning(f"⚠️ Unhandled agent_type '{agent_type}'. Using generic response.")
            # For now, we can use the same engine but this is where a different one would go
            response_text = await asyncio.to_thread(
                llm_service.ask_business_consultant,
                user_id=user_id,
                query=full_query
            )

    except Exception as e:
        logger.error(f"AI Engine Error: {e}", exc_info=True)
        response_text = "Më vjen keq, nuk munda të procesoj kërkesën tuaj momentalisht."

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