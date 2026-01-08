# FILE: backend/app/api/endpoints/analysis.py
# PHOENIX PROTOCOL - ROUTER V3.0 (EXPENSE EXTRACTION)
# 1. FEATURE: Added '/extract-expense-from-file' endpoint.
# 2. LOGIC: Handles file upload to the Archive and dispatches the AI extraction task.
# 3. ORCHESTRATION: Returns the archive_item_id to the client for real-time status tracking via SSE.

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import Any, Annotated

from app.services import spreadsheet_service
from app.services.archive_service import ArchiveService
from app.models.user import UserInDB
from .dependencies import get_current_active_user, get_db
from app.celery_app import celery_app

router = APIRouter()

# PHOENIX: New endpoint for intelligent expense creation
@router.post("/extract-expense-from-file")
async def extract_expense_from_file(
    current_user: Annotated[UserInDB, Depends(get_current_active_user)],
    db: Any = Depends(get_db),
    file: UploadFile = File(...)
) -> Any:
    """
    1. Uploads a receipt/invoice file to the user's archive.
    2. Triggers a background Celery task to perform OCR and extract expense data.
    3. Returns the archive item ID so the frontend can listen for completion via SSE.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is missing.")

    # 1. Save the file to the user's archive
    try:
        archive_service = ArchiveService(db)
        # Category 'EXPENSE_RECEIPT' helps with organization
        archive_item = await archive_service.add_file_to_archive(
            user_id=str(current_user.id),
            file=file,
            category="EXPENSE_RECEIPT",
            title=file.filename
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file to archive: {str(e)}")

    # 2. Dispatch the AI extraction task
    try:
        celery_app.send_task(
            "app.tasks.document_processing.process_and_extract_expense",
            args=[str(archive_item.id)]
        )
    except Exception as e:
        # If queuing fails, we should ideally delete the archive item to prevent orphans
        # For now, we'll just log the error
        raise HTTPException(status_code=500, detail=f"Failed to dispatch AI analysis task: {str(e)}")

    # 3. Return the ID for the frontend to track
    return {"archive_item_id": str(archive_item.id), "status": "processing"}


@router.post("/analyze-spreadsheet")
async def analyze_spreadsheet(file: UploadFile = File(...)) -> Any:
    """
    (Legacy) Uploads a CSV/Excel file for statistical analysis.
    """
    if not file.filename or not file.filename.lower().endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only CSV or Excel files are supported.")
    
    contents = await file.read()
    result = spreadsheet_service.analyze_financial_spreadsheet(contents, file.filename)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result