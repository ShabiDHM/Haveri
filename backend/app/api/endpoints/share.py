# FILE: backend/app/api/endpoints/share.py
# PHOENIX PROTOCOL - SHARE ENDPOINT V2.3 (TYPO FIX)
# 1. FIX: Corrected typo from 'pantic' to 'pydantic'.

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, JSONResponse
from pymongo.database import Database
from pydantic import BaseModel
import os
from bson import ObjectId

from app.api.endpoints.dependencies import get_db, get_current_user
from app.services.share_service import ShareService
from app.models.user import UserInDB

router = APIRouter()

# CONFIGURATION
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://www.haveri.tech")
API_URL = os.getenv("API_BASE_URL", "https://api.haveri.tech")

class ShareUpdateRequest(BaseModel):
    is_shared: bool

# --- PUBLIC/CLIENT PORTAL DATA ENDPOINT ---

@router.get("/portal/{case_id}", response_class=JSONResponse)
def get_public_data_for_portal(case_id: str, db: Database = Depends(get_db)):
    service = ShareService(db)
    public_data = service.get_public_case_data(case_id)
    if not public_data:
        raise HTTPException(status_code=404, detail="Case not found or has no shared items.")
    return public_data

# --- INTERNAL SHARING TOGGLE ENDPOINTS ---

@router.put("/case/{case_id}", status_code=status.HTTP_200_OK)
def update_case_share_status(
    case_id: str,
    update_data: ShareUpdateRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    service = ShareService(db)
    service.set_case_share_status(case_id, str(current_user.id), update_data.is_shared)
    return {"status": "success", "case_id": case_id, "is_shared": update_data.is_shared}

# --- SOCIAL MEDIA PREVIEW ENDPOINT ---

@router.get("/{case_id}", response_class=HTMLResponse)
def get_smart_share_preview(case_id: str, db: Database = Depends(get_db)):
    service = ShareService(db)
    case_data = service.get_public_case_data(case_id)
    
    if not case_data:
        return HTMLResponse(content=f'<html><head><meta http-equiv="refresh" content="0;url={FRONTEND_URL}" /></head><body></body></html>')

    title = case_data.get("title", "Dosje")
    client = case_data.get("client_name", "Klient")
    case_number = case_data.get("case_number", "---")
    status_str = str(case_data.get("status", "OPEN")).upper()
    org_name = case_data.get("organization_name", "Haveri Portal")
    
    logo_path = case_data.get("logo")
    logo_url = f"{FRONTEND_URL}/logo.png"
    
    if logo_path:
        if logo_path.startswith("http"):
            logo_url = logo_path
        elif logo_path.startswith("/"):
            logo_url = f"{API_URL}{logo_path}"

    html_content = f"""
    <!DOCTYPE html>
    <html lang="sq">
    <head>
        <meta charset="UTF-8">
        <title>{title} | {org_name}</title>
        <meta property="og:type" content="website" />
        <meta property="og:url" content="{FRONTEND_URL}/portal/{case_id}" />
        <meta property="og:title" content="{title} (#{case_number})" />
        <meta property="og:description" content="Klient: {client} | Status: {status_str} | {org_name}" />
        <meta property="og:image" content="{logo_url}" />
        <script>window.location.replace("{FRONTEND_URL}/portal/{case_id}");</script>
    </head>
    <body><p>Duke hapur dosjen...</p></body>
    </html>
    """
    
    return HTMLResponse(content=html_content, status_code=200)