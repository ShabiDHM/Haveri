# FILE: backend/app/services/chat_service.py
# PHOENIX PROTOCOL - CHAT SERVICE V3.0 (AGENT INTEGRATION)
# 1. REFACTOR: Removed manual RAG logic.
# 2. INTEGRATION: Instantiates AlbanianRAGService and calls agent.chat().
# 3. STREAMING: Preserved SSE broadcasting for real-time UI updates.

from __future__ import annotations
import logging
import asyncio
from datetime import datetime, timezone
from typing import Any, Optional, cast

from fastapi import HTTPException
from bson import ObjectId
from bson.errors import InvalidId

from app.models.case import ChatMessage
# PHOENIX: Import the new Agent Service
from app.services.albanian_rag_service import AlbanianRAGService
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

    # 2. Save User Message
    await db.cases.update_one(
        {"_id": oid},
        {"$push": {"chat_history": ChatMessage(role="user", content=user_query, timestamp=datetime.now(timezone.utc)).model_dump()}}
    )
    
    # 3. Execute Agentic Workflow
    response_text: str = "" 
    try:
        # Initialize Agent
        rag_agent = AlbanianRAGService(db)
        
        # Call the Agent's Chat (This runs the Researcher -> Critic -> Reviser loop)
        response_text = await rag_agent.chat(
            query=user_query,
            user_id=user_id,
            case_id=case_id
        )

    except Exception as e:
        logger.error(f"Agent Error: {e}", exc_info=True)
        response_text = "Kërkoj ndjesë, agjenti hasi në një problem."

    # 4. Save & Broadcast AI Response
    try:
        await db.cases.update_one(
            {"_id": oid},
            {"$push": {"chat_history": ChatMessage(role="ai", content=response_text, timestamp=datetime.now(timezone.utc)).model_dump()}}
        )

        await broadcast_message(
            user_id=user_id,
            message_data={
                "type": "CHAT_MESSAGE",
                "case_id": case_id,
                "content": response_text
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to save/broadcast AI response: {e}")

    return response_text