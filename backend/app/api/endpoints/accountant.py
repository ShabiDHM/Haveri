# FILE: backend/app/api/endpoints/accountant.py
# PHOENIX PROTOCOL - ACCOUNTANT ENDPOINT V1.5 (STORAGE FIX)
# 1. FIXED: Replaced 'upload_file' with 'upload_bytes_as_file' to match Storage Service.
# 2. LOGIC: Uses 'archive' as the default folder for non-case-based reports.
# 3. STATUS: Functional and Error-Free.

from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse, Response
from typing import Annotated
from pydantic import BaseModel
from pymongo.database import Database
from datetime import datetime
import io

from app.api.endpoints.dependencies import get_current_user, get_db
from app.models.user import UserInDB
from app.services.accountant_chat_service import chat_with_accountant
from app.services.report_service import generate_forensic_audit_pdf
from app.services import storage_service
from app.tasks.document_processing import process_archive_document

router = APIRouter(tags=["Forensic Accountant"])

class AuditExportRequest(BaseModel):
    content: str

@router.post("/chat")
async def accountant_audit_chat(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    query: str = Body(..., embed=True)
):
    if not query or len(query.strip()) < 2:
        raise HTTPException(status_code=400, detail="Pyetja është shumë e shkurtër.")

    try:
        generator = chat_with_accountant(user_id=str(current_user.id), query=query)
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
    try:
        pdf_buffer = generate_forensic_audit_pdf(request.content, str(current_user.id), db)
        headers = {'Content-Disposition': f'attachment; filename="Raport_Auditimi_{datetime.now().strftime("%Y-%m-%d")}.pdf"'}
        return Response(content=pdf_buffer.getvalue(), media_type='application/pdf', headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Dështoi gjenerimi i raportit PDF.")

@router.post("/save-report")
async def save_audit_report_to_archive(
    request: AuditExportRequest,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db)
):
    """
    Generates the PDF and saves it directly to the user's Havery Archive using the correct Storage API.
    """
    try:
        # 1. Generate PDF
        pdf_buffer = generate_forensic_audit_pdf(request.content, str(current_user.id), db)
        file_content = pdf_buffer.getvalue()
        file_size = len(file_content)
        
        filename = f"Raport_Auditimi_{datetime.now().strftime('%Y-%m-%d_%H%M')}.pdf"
        
        # 2. PHOENIX FIX: Use 'upload_bytes_as_file' with 'archive' as the folder context
        storage_key = storage_service.upload_bytes_as_file(
            file_obj=io.BytesIO(file_content),
            filename=filename,
            user_id=str(current_user.id),
            case_id="archive", # Havery 'Flat Desk' Logic
            content_type="application/pdf"
        )
        
        # 3. Create DB Record in 'archives'
        new_doc = {
            "user_id": current_user.id,
            "title": filename,
            "file_type": "PDF",
            "category": "REPORTS", 
            "storage_key": storage_key,
            "file_size": file_size,
            "is_shared": False,
            "indexing_status": "PENDING",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = db.archives.insert_one(new_doc)
        doc_id = str(result.inserted_id)
        
        # 4. Trigger Indexing
        process_archive_document.delay(doc_id)
        
        return {"message": "Raporti u ruajt në Arkivë me sukses.", "document_id": doc_id}

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Save Audit to Archive Error: {e}")
        raise HTTPException(status_code=500, detail="Dështoi ruajtja e raportit në arkivë.")