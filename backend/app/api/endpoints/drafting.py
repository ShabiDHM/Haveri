# FILE: app/api/endpoints/drafting.py
# PHOENIX PROTOCOL - DRAFTING ENDPOINT V1.3 (PURCHASE ORDER WITH ARCHIVE SAVE)

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.services.drafting_service import DraftingService
from app.services.archive_service import ArchiveService
from app.api.endpoints.dependencies import get_current_user, get_db
from app.models.user import UserInDB
from pymongo.database import Database

router = APIRouter(tags=["drafting"])

class DraftRequest(BaseModel):
    user_prompt: str
    document_type: str = "generic"
    include_legal_context: bool = True

class PurchaseOrderRequest(BaseModel):
    item_id: str
    item_name: str
    unit: str
    quantity: float
    estimated_cost: float
    supplier_name: str

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

@router.post("/purchase-order")
async def create_purchase_order(
    order: PurchaseOrderRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Create a purchase order and save it as a text file in the archive.
    """
    # Build the purchase order content
    content = f"""POROSIA E BLERJES
Data: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Produkti: {order.item_name}
Njësia: {order.unit}
Sasia: {order.quantity}
Furnitori: {order.supplier_name}
Kosto e vlerësuar: €{order.estimated_cost:.2f}
Statusi: Draft (krijuar nga AI)
"""
    file_content = content.encode('utf-8')
    filename = f"purchase_order_{order.item_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    
    archive_service = ArchiveService(db)
    try:
        # case_id can be None if no workspace context
        archive_item = await archive_service.save_generated_file(
            user_id=str(current_user.id),
            filename=filename,
            file_content=file_content,
            category="purchase_order",
            title=f"Porosia Blerje: {order.item_name}",
            case_id=None          # Use None or current_user.current_workspace_id if available
        )
        return {
            "status": "created",
            "message": f"Purchase order for {order.item_name} saved to archive.",
            "archive_id": archive_item.id,      # .id, not ._id
            "order": order.dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save purchase order: {str(e)}")

@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "drafting"}