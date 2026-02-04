# FILE: backend/app/api/endpoints/accountant.py
# PHOENIX PROTOCOL - ACCOUNTANT ENDPOINT V1.3 (DATETIME FIX)
# 1. FIXED: Imported 'datetime' module to resolve Pylance error in PDF export.
# 2. STATUS: Unabridged and production-ready.

from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse, Response
from typing import Annotated
from pydantic import BaseModel
from pymongo.database import Database
from datetime import datetime # PHOENIX FIX: Added missing import

from app.api.endpoints.dependencies import get_current_user, get_db
from app.models.user import UserInDB
from app.services.accountant_chat_service import chat_with_accountant
from app.services.report_service import generate_forensic_audit_pdf

router = APIRouter(tags=["Forensic Accountant"])

class AuditExportRequest(BaseModel):
    content: str

@router.post("/chat")
async def accountant_audit_chat(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    query: str = Body(..., embed=True)
):
    """
    Primary portal for the Forensic Accountant Agent. Streams responses.
    """
    if not query or len(query.strip()) < 2:
        raise HTTPException(status_code=400, detail="Pyetja është shumë e shkurtër.")

    try:
        generator = chat_with_accountant(
            user_id=str(current_user.id),
            query=query
        )
        return StreamingResponse(
            generator, 
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Accountant API Error: {e}")
        raise HTTPException(status_code=500, detail="Dështoi komunikimi me Shërbimin e Kontabilitetit.")

@router.post("/export-audit")
async def export_audit_report(
    request: AuditExportRequest,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db)
):
    """
    Takes the text content of an audit and returns a formatted PDF.
    """
    try:
        pdf_buffer = generate_forensic_audit_pdf(request.content, str(current_user.id), db)
        
        headers = {
            'Content-Disposition': f'attachment; filename="Raport_Auditimi_{datetime.now().strftime("%Y-%m-%d")}.pdf"'
        }
        return Response(content=pdf_buffer.getvalue(), media_type='application/pdf', headers=headers)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Audit PDF Export Error: {e}")
        raise HTTPException(status_code=500, detail="Dështoi gjenerimi i raportit PDF.")