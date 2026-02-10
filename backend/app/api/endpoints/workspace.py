# FILE: backend/app/api/endpoints/workspace.py
# PHOENIX PROTOCOL - WORKSPACE ROUTER V1.5 (PUBLIC PORTAL RESTORATION)
# 1. ADDED: Missing public endpoints (/timeline, /documents, /message) to fix 404s.
# 2. FEATURE: Enables full functionality for the Client Portal (timeline, docs, contact form).
# 3. STATUS: Synchronized with Frontend ClientPortalPage.tsx.

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
    file_name: str
    created_at: datetime
    file_type: str
    source: str 

class ClientMessageRequest(BaseModel):
    firstName: str
    lastName: str
    email: str
    phone: str
    message: str

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

# --- PUBLIC PORTAL ENDPOINTS (PHOENIX RESTORATION) ---

@router.get("/public/{id}/timeline", tags=["Public Portal"])
async def get_public_workspace_timeline(id: str, db: Database = Depends(get_db)):
    """Fetches public workspace details and shared documents for the Client Portal."""
    case_oid = validate_object_id(id)
    workspace = await asyncio.to_thread(db.cases.find_one, {"_id": case_oid})
    if not workspace: raise HTTPException(404, "Workspace not found.")
    
    # Get Owner Profile for branding
    owner_id = workspace.get("owner_id") or workspace.get("user_id")
    profile = await asyncio.to_thread(db.business_profiles.find_one, {"user_id": ObjectId(owner_id)})
    
    # Get Shared Documents (Active & Archived)
    active_docs = list(db.documents.find({"case_id": case_oid, "is_shared": True}))
    archived_docs = list(db.archives.find({"case_id": id, "is_shared": True}))
    
    shared_docs = []
    for d in active_docs:
        shared_docs.append(PublicDocumentItem(id=str(d["_id"]), file_name=d.get("file_name"), created_at=d.get("created_at"), file_type="PDF", source="ACTIVE"))
    for d in archived_docs:
        shared_docs.append(PublicDocumentItem(id=str(d["_id"]), file_name=d.get("title"), created_at=d.get("created_at"), file_type=d.get("file_type", "FILE"), source="ARCHIVE"))
    
    return {
        "workspace_number": workspace.get("case_number", "N/A"),
        "title": workspace.get("title", "Portal"),
        "client_name": workspace.get("client_name", "Klient"),
        "status": workspace.get("status", "ACTIVE"),
        "description": workspace.get("description", ""),
        "organization_name": profile.get("firm_name") if profile else "Haveri Portal",
        "logo": f"/api/v1/workspace/public/{id}/logo" if profile and profile.get("logo_storage_key") else None,
        "owner_email": profile.get("email_public") if profile else None,
        "owner_phone": profile.get("phone") if profile else None,
        "owner_address": profile.get("address") if profile else None,
        "owner_city": profile.get("city") if profile else None,
        "owner_website": profile.get("website") if profile else None,
        "documents": shared_docs
    }

@router.post("/public/{id}/message", tags=["Public Portal"])
async def send_public_message(id: str, msg: ClientMessageRequest, db: Database = Depends(get_db)):
    """Allows clients to send messages from the portal."""
    case_oid = validate_object_id(id)
    workspace = await asyncio.to_thread(db.cases.find_one, {"_id": case_oid})
    if not workspace: raise HTTPException(404, "Workspace not found.")
    
    message_doc = {
        "workspace_id": id,
        "owner_id": workspace.get("owner_id"),
        "sender_name": f"{msg.firstName} {msg.lastName}",
        "sender_email": msg.email,
        "sender_phone": msg.phone,
        "content": msg.message,
        "created_at": datetime.now(timezone.utc),
        "status": "INBOX"
    }
    await asyncio.to_thread(db.inbound_messages.insert_one, message_doc)
    return {"status": "sent"}

@router.get("/public/{id}/documents/{doc_id}/download", tags=["Public Portal"])
async def download_public_workspace_doc(id: str, doc_id: str, source: str = Query("ACTIVE", enum=["ACTIVE", "ARCHIVE"]), db: Database = Depends(get_db)):
    case_oid, doc_oid = validate_object_id(id), validate_object_id(doc_id)
    coll = db.documents if source == "ACTIVE" else db.archives
    doc_data = await asyncio.to_thread(coll.find_one, {"_id": doc_oid})
    
    # Security Check: Must be shared and belong to this workspace
    if not doc_data or not doc_data.get("is_shared"): raise HTTPException(403, "Access Denied.")
    # Archive items store case_id as string usually, Documents as ObjectId. We check both.
    doc_case_id = doc_data.get("case_id")
    if str(doc_case_id) != id and doc_case_id != case_oid: raise HTTPException(403, "Access Denied.")

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