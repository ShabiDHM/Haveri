# FILE: backend/app/api/endpoints/chat.py
# PHOENIX PROTOCOL - CHAT ENDPOINT V3.0 (PERSONA ROUTING)
# 1. FEATURE: Added 'agent_type' to the request model.
# 2. LOGIC: Passes the 'agent_type' to the chat service, allowing it to select the 'Business Consultant' persona.

from fastapi import APIRouter, Depends, HTTPException, status, Response
from typing import Annotated, Any, Optional
from pydantic import BaseModel
import logging
from bson import ObjectId
from app.services import chat_service
from app.models.user import UserInDB
from app.api.endpoints.dependencies import get_current_active_user
from app.core.db import get_async_db

router = APIRouter(tags=["Chat"])
logger = logging.getLogger(__name__)

class ChatMessageRequest(BaseModel):
    message: str
    document_id: Optional[str] = None
    jurisdiction: Optional[str] = 'ks'
    # PHOENIX: Added to select the correct AI persona
    agent_type: str = 'business' 

class ChatResponse(BaseModel):
    response: str

@router.post("/case/{case_id}", response_model=ChatResponse)
async def handle_chat_message(
    case_id: str, 
    chat_request: ChatMessageRequest, 
    current_user: Annotated[UserInDB, Depends(get_current_active_user)], 
    db: Any = Depends(get_async_db)
):
    """
    Sends a message to the AI Case Chat.
    Delegates to the Chat Service for processing and broadcasting.
    """
    if not chat_request.message: 
        raise HTTPException(status_code=400, detail="Empty message")
        
    scope_log = f"Document {chat_request.document_id}" if chat_request.document_id else "Full Case"
    agent_log = chat_request.agent_type.upper()
    logger.info(f"📨 API Recv: Chat from User {current_user.id} [Agent: {agent_log}] [Scope: {scope_log}]")

    try:
        # Call the refactored service with the agent_type parameter
        response_text = await chat_service.get_http_chat_response(
            db=db, 
            case_id=case_id, 
            user_query=chat_request.message, 
            user_id=str(current_user.id),
            document_id=chat_request.document_id,
            jurisdiction=chat_request.jurisdiction,
            agent_type=chat_request.agent_type # PHOENIX: Pass the agent type
        )
            
        return ChatResponse(response=response_text)
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Unhandled Chat API Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/case/{case_id}/history", status_code=status.HTTP_204_NO_CONTENT)
async def clear_chat_history(case_id: str, current_user: Annotated[UserInDB, Depends(get_current_active_user)], db: Any = Depends(get_async_db)):
    try:
        case_collection = db.cases
        result = await case_collection.update_one(
            {"_id": ObjectId(case_id), "owner_id": current_user.id},
            {"$set": {"chat_history": []}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Case not found or access denied.")
            
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        logger.error(f"Failed to clear chat history: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear chat history.")