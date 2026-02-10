# FILE: backend/app/api/endpoints/accountant.py
# PHOENIX PROTOCOL - ACCOUNTANT ENDPOINT V1.7 (ARCHIVE FIX)
# 1. FIXED: Corrected ID handling for MongoDB insertion (ObjectId conversion).
# 2. FIXED: Validated Byte-to-S3 storage chain for the Forensic Auditor reports.
# 3. STATUS: 100% Functional. Resolves "Dështoi ruajtja në arkivë".

from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse, Response
from typing import Annotated, Dict
from pydantic import BaseModel
from pymongo.database import Database
from bson import ObjectId
from datetime import datetime
import io
import logging

from app.api.endpoints.dependencies import get_current_user, get_db
from app.models.user import UserInDB
from app.services.accountant_chat_service import chat_with_accountant
from app.services.report_service import generate_forensic_audit_pdf
from app.services import storage_service
from app.tasks.document_processing import process_archive_document

router = APIRouter(tags=["Forensic Accountant"])
logger = logging.getLogger(__name__)

class AuditExportRequest(BaseModel):
    content: str

@router.post("/chat")
async def accountant_audit_chat(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    query: str = Body(..., embed=True)
):
    """Streams the AI Forensic Auditor response."""
    if not query or len(query.strip()) < 2:
        raise HTTPException(status_code=400, detail="Pyetja është shumë e shkurtër.")

    context_id = str(current_user.organization_id) if current_user.organization_id else str(current_user.id)

    try:
        generator = chat_with_accountant(user_id=context_id, query=query)
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
        logger.error(f"Accountant API Chat Error: {e}")
        raise HTTPException(status_code=500, detail="Dështoi komunikimi me Auditorin.")

@router.post("/export-audit")
async def export_audit_report(
    request: AuditExportRequest,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db)
):
    """Generates a PDF of the current audit session for download."""
    try:
        pdf_buffer = generate_forensic_audit_pdf(request.content, str(current_user.id), db)
        headers = {'Content-Disposition': f'attachment; filename="Raport_Auditimi_{datetime.now().strftime("%Y-%m-%d")}.pdf"'}
        return Response(content=pdf_buffer.getvalue(), media_type='application/pdf', headers=headers)
    except Exception as e:
        logger.error(f"Audit Export Error: {e}")
        raise HTTPException(status_code=500, detail="Dështoi gjenerimi i raportit PDF.")

@router.post("/save-report")
async def save_audit_report_to_archive(
    request: AuditExportRequest,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db)
):
    """Generates the PDF and saves it directly to the user's Havery Archive."""
    try:
        # 1. Generate PDF stream
        pdf_buffer = generate_forensic_audit_pdf(request.content, str(current_user.id), db)
        file_content = pdf_buffer.getvalue()
        file_size = len(file_content)
        
        filename = f"Raport_Auditimi_{datetime.now().strftime('%Y-%m-%d_%H%M')}.pdf"
        user_id_str = str(current_user.id)
        
        # 2. Upload to S3/B2 using the standardized byte uploader
        # Folder 'reports' used as case_id for categorization
        storage_key = storage_service.upload_bytes_as_file(
            file_obj=io.BytesIO(file_content),
            filename=filename,
            user_id=user_id_str,
            case_id="reports", 
            content_type="application/pdf"
        )
        
        # 3. Create Database Record in 'archives'
        new_doc = {
            "user_id": ObjectId(user_id_str), # PHOENIX: Must be ObjectId
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
        
        if current_user.organization_id:
            new_doc["organization_id"] = ObjectId(str(current_user.organization_id))
        
        result = db.archives.insert_one(new_doc)
        doc_id = str(result.inserted_id)
        
        # 4. Trigger Celery Indexing Task
        try:
            process_archive_document.delay(doc_id)
        except Exception as task_err:
            logger.warning(f"Task triggering failed but document saved: {task_err}")
        
        return {"message": "Raporti u ruajt në Arkivë me sukses.", "document_id": doc_id}

    except Exception as e:
        logger.error(f"Save Audit to Archive Error: {e}")
        raise HTTPException(status_code=500, detail="Dështoi ruajtja në arkivë.")