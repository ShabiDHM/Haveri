# FILE: backend/app/api/endpoints/workspace.py
# PHOENIX PROTOCOL - WORKSPACE ROUTER V1.4 (CONSTRUCTOR ALIGNMENT)
# 1. FIXED: Initializing WorkspaceCreate using alias names to satisfy strict Pylance checks.
# 2. STATUS: Error-free.

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Body, Query
from typing import List, Annotated, Dict, Optional, Any
from fastapi.responses import Response, StreamingResponse, JSONResponse
from pydantic import BaseModel
from pymongo.database import Database
import redis
from bson import ObjectId
from bson.errors import InvalidId
import asyncio
import logging
import io
import urllib.parse
import mimetypes
from datetime import datetime, timezone

from ...services import workspace_service, document_service, report_service, storage_service, archive_service, pdf_service, llm_service
from ...models.workspace import WorkspaceCreate, WorkspaceOut 
from ...models.user import UserInDB
from ...models.archive import ArchiveItemOut 
from ...models.document import DocumentOut
from ...models.finance import InvoiceInDB

from .dependencies import get_current_user, get_db, get_sync_redis
from ...celery_app import celery_app

router = APIRouter(tags=["Workspace"])
logger = logging.getLogger(__name__)

# --- LOCAL SCHEMAS ---
class DocumentContentOut(BaseModel):
    text: str
class DeletedDocumentResponse(BaseModel):
    documentId: str
    deletedFindingIds: List[str]
class RenameDocumentRequest(BaseModel):
    new_name: str
class ShareDocumentRequest(BaseModel):
    is_shared: bool 
class BulkDeleteRequest(BaseModel):
    document_ids: List[str]
class ArchiveImportRequest(BaseModel):
    archive_item_ids: List[str]

class PublicDocumentItem(BaseModel):
    id: str
    title: str
    created_at: datetime
    file_size: Optional[int] = 0
    file_type: str
    source: str 

def validate_object_id(id_str: str) -> ObjectId:
    try: return ObjectId(id_str)
    except InvalidId: raise HTTPException(status_code=400, detail="Invalid ID format.")

# --- WORKSPACE ENDPOINTS ---

@router.get("/primary", response_model=WorkspaceOut)
async def get_primary_workspace(current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    workspace = await asyncio.to_thread(db.cases.find_one, {"owner_id": current_user.id})
    if not workspace:
        try:
            ws_name = f"Hapësira e {current_user.full_name or current_user.username}"
            # PHOENIX: Using primary alias names to satisfy constructor check
            default_ws = WorkspaceCreate(
                title=ws_name, 
                case_name=ws_name, 
                case_number=f"WS-{str(current_user.id)[-4:]}",
                status="ACTIVE"
            )
            created_ws = await asyncio.to_thread(workspace_service.create_workspace, db=db, ws_in=default_ws, owner=current_user)
            if not created_ws: raise HTTPException(500, "Initialization failed.")
            return created_ws
        except Exception: raise HTTPException(500, "Initialization failed.")
    return await asyncio.to_thread(workspace_service._map_workspace_document, workspace, db)

@router.get("/", response_model=List[WorkspaceOut])
async def get_user_workspaces(current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    return await asyncio.to_thread(workspace_service.get_workspaces_for_user, db=db, owner=current_user)

@router.post("/", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
async def create_new_workspace(ws_in: WorkspaceCreate, current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    return await asyncio.to_thread(workspace_service.create_workspace, db=db, ws_in=ws_in, owner=current_user)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(id: str, current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    validated_id = validate_object_id(id)
    await asyncio.to_thread(workspace_service.delete_workspace_by_id, db=db, ws_id=validated_id, owner=current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# --- DOCUMENT ENDPOINTS ---

@router.get("/{id}/documents", response_model=List[DocumentOut], tags=["Documents"])
async def get_workspace_documents(id: str, current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    return await asyncio.to_thread(document_service.get_documents_by_case_id, db, id, current_user)

@router.post("/{id}/documents/upload", status_code=status.HTTP_202_ACCEPTED, tags=["Documents"])
async def upload_workspace_document(id: str, current_user: Annotated[UserInDB, Depends(get_current_user)], file: UploadFile = File(...), db: Database = Depends(get_db)):
    try:
        pdf_bytes, final_filename = await pdf_service.pdf_service.process_and_brand_pdf(file, id)
        pdf_file_obj = io.BytesIO(pdf_bytes)
        pdf_file_obj.name = final_filename 
        storage_key = await asyncio.to_thread(storage_service.upload_bytes_as_file, file_obj=pdf_file_obj, filename=final_filename, user_id=str(current_user.id), case_id=id, content_type="application/pdf")
        new_doc = document_service.create_document_record(db=db, owner=current_user, case_id=id, file_name=final_filename, storage_key=storage_key, mime_type="application/pdf")
        celery_app.send_task("process_document_task", args=[str(new_doc.id)])
        return DocumentOut.model_validate(new_doc)
    except Exception: raise HTTPException(500, "Upload failed.")

@router.get("/{id}/documents/{doc_id}/preview", tags=["Documents"])
async def get_workspace_doc_preview(id: str, doc_id: str, current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    file_stream, doc = await asyncio.to_thread(document_service.get_preview_document_stream, db, doc_id, current_user)
    if str(doc.case_id) != id: raise HTTPException(status_code=403)
    return StreamingResponse(file_stream, media_type="application/pdf")

@router.get("/public/{id}/documents/{doc_id}/download", tags=["Public Portal"])
async def download_public_workspace_doc(id: str, doc_id: str, source: str = Query("ACTIVE", enum=["ACTIVE", "ARCHIVE"]), db: Database = Depends(get_db)):
    case_oid, doc_oid = validate_object_id(id), validate_object_id(doc_id)
    coll = db.documents if source == "ACTIVE" else db.archives
    doc_data = await asyncio.to_thread(coll.find_one, {"_id": doc_oid, "$or": [{"case_id": id}, {"case_id": case_oid}]})
    if not doc_data or not doc_data.get("is_shared"): raise HTTPException(403)
    s_key = doc_data.get("storage_key")
    if not s_key: raise HTTPException(404, "File not found.")
    file_stream = await asyncio.to_thread(storage_service.download_original_document_stream, s_key)
    return StreamingResponse(file_stream, media_type="application/pdf")

@router.get("/public/{id}/logo", tags=["Public Portal"])
async def get_public_workspace_logo(id: str, db: Database = Depends(get_db)):
    case_oid = validate_object_id(id)
    workspace = await asyncio.to_thread(db.cases.find_one, {"_id": case_oid})
    if not workspace: raise HTTPException(404, "Workspace not found.")
    owner_id = workspace.get("owner_id") or workspace.get("user_id")
    if not owner_id: raise HTTPException(404, "Owner not found.")
    profile = await asyncio.to_thread(db.business_profiles.find_one, {"user_id": ObjectId(owner_id)})
    if not profile or not profile.get("logo_storage_key"): raise HTTPException(404)
    stream = await asyncio.to_thread(storage_service.get_file_stream, profile["logo_storage_key"])
    return StreamingResponse(stream, media_type="image/png")