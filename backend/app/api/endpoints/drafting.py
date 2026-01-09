# FILE: backend/app/api/endpoints/drafting.py
# PHOENIX PROTOCOL - DRAFTING V1.1 (ENHANCED PAYLOAD)
# 1. MODEL: Upgraded PurchaseOrderRequest to accept optional supplier details.

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from pymongo.database import Database
from datetime import datetime
from typing import Optional

from app.api.endpoints.dependencies import get_current_user, get_db
from app.models.user import UserInDB
from app.services import report_service
from app.services.archive_service import ArchiveService

router = APIRouter()

class PurchaseOrderRequest(BaseModel):
    item_id: str
    item_name: str
    unit: str
    quantity: float
    estimated_cost: float
    supplier_name: str
    supplier_details: Optional[str] = None # New field

@router.post("/purchase-order", status_code=status.HTTP_201_CREATED)
async def create_purchase_order_draft(
    po_data: PurchaseOrderRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    user_id = str(current_user.id)
    archive_service = ArchiveService(db)
    
    try:
        pdf_buffer = report_service.generate_purchase_order_pdf(po_data.model_dump(), db, user_id)
        pdf_content = pdf_buffer.getvalue()
        
        filename = f"Porosi_{po_data.item_name.replace(' ', '_')}_{int(datetime.now().timestamp())}.pdf"
        title = f"Porosi Blerjeje: {po_data.item_name}"
        
        await archive_service.save_generated_file(
            user_id=user_id,
            filename=filename,
            file_content=pdf_content,
            category="CONTRACTS",
            title=title,
            case_id=None
        )
        
        return {"status": "success", "message": "Purchase Order PDF created and archived."}

    except Exception as e:
        print(f"PO Drafting Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate or save the purchase order PDF.")