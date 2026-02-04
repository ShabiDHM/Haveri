# FILE: backend/app/api/endpoints/accountant.py
# PHOENIX PROTOCOL - ACCOUNTANT ENDPOINT V1.1 (CLEAN IMPORT)
from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from typing import Annotated
from app.api.endpoints.dependencies import get_current_user
from app.models.user import UserInDB
from app.services.accountant_chat_service import chat_with_accountant # This now works

router = APIRouter(tags=["Forensic Accountant"])

@router.post("/chat")
async def accountant_audit_chat(current_user: Annotated[UserInDB, Depends(get_current_user)], query: str = Body(..., embed=True)):
    if not query: raise HTTPException(status_code=400, detail="Query is missing.")
    generator = chat_with_accountant(user_id=str(current_user.id), query=query)
    return StreamingResponse(generator, media_type="text/event-stream")