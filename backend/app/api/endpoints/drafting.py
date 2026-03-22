# FILE: app/api/endpoints/drafting.py
# PHOENIX PROTOCOL - DRAFTING ENDPOINT V1.0

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from app.services.drafting_service import DraftingService
from app.api.endpoints.dependencies import get_current_user
from app.models.user import UserInDB

router = APIRouter(prefix="/drafting", tags=["drafting"])

class DraftRequest(BaseModel):
    user_prompt: str
    document_type: str = "generic"
    include_legal_context: bool = True

@router.post("/stream")
async def stream_draft(
    request: DraftRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Generate a legal document with streaming response.
    Uses Juristi's knowledge base for legal context.
    """
    if not request.user_prompt or not request.user_prompt.strip():
        raise HTTPException(status_code=400, detail="User prompt is required")
    
    drafting_service = DraftingService()
    
    async def generate():
        async for chunk in drafting_service.draft_document_stream(
            user_prompt=request.user_prompt,
            document_type=request.document_type,
            include_legal_context=request.include_legal_context
        ):
            yield chunk
    
    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={
            "Content-Disposition": "attachment; filename=draft.txt",
            "X-Content-Type-Options": "nosniff"
        }
    )

@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "drafting"}